import nodemailer from "nodemailer";
import { signEmailToken, signCandidateInviteToken } from "./jwt";
import { prisma } from "./prisma";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || "Vertex International <noreply@vertexinternational.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Helper to fetch dynamic DB templates and fallback to hardcoded defaults
async function getEmailConfig(event: string, defaultSubject: string, defaultHtml: string) {
  try {
    const template = await prisma.emailTemplate.findUnique({ where: { event } });
    if (template) return { subject: template.subject, html: template.body_html };
  } catch (e) {
    console.warn("DB not ready or template missing. Using default template.");
  }
  return { subject: defaultSubject, html: defaultHtml };
}

export async function sendVerificationEmail(userId: string, email: string, fullName: string) {
  const token = signEmailToken({ userId, email, type: "email_verification" });
  const verifyUrl = `${APP_URL}/auth/verify-email?token=${token}`;

  const defaultHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1a365d;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Vertex International</h1>
          <p style="color:#90cdf4;margin:4px 0 0;">Recruitment Platform</p>
        </div>
        <div style="padding:32px;background:#f7fafc;">
          <h2 style="color:#1a365d;">Welcome, {{fullName}}!</h2>
          <p style="color:#4a5568;line-height:1.6;">
            Thank you for registering with Vertex International Recruitment.
            Please verify your email address to activate your account.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="{{verifyUrl}}"
               style="background:#1a365d;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;">
              Verify Email Address
            </a>
          </div>
          <p style="color:#718096;font-size:14px;">This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
        </div>
        <div style="background:#edf2f7;padding:16px;text-align:center;">
          <p style="color:#718096;font-size:12px;margin:0;">© ${new Date().getFullYear()} Vertex International Recruitment. All rights reserved.</p>
        </div>
      </div>
  `;

  const config = await getEmailConfig("welcome", "Verify your Vertex International account", defaultHtml);
  const finalHtml = config.html
    .replace(/\{\{fullName\}\}/g, fullName)
    .replace(/\{\{verifyUrl\}\}/g, verifyUrl);

  await transporter.sendMail({ from: FROM, to: email, subject: config.subject, html: finalHtml });
}

export async function sendPasswordResetEmail(userId: string, email: string, fullName: string) {
  const token = signEmailToken({ userId, email, type: "password_reset" });
  const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;

  const defaultHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1a365d;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Vertex International</h1>
        </div>
        <div style="padding:32px;background:#f7fafc;">
          <h2 style="color:#1a365d;">Password Reset</h2>
          <p style="color:#4a5568;">Hi {{fullName}}, click the button below to reset your password.</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="{{resetUrl}}"
               style="background:#c53030;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">
              Reset Password
            </a>
          </div>
          <p style="color:#718096;font-size:14px;">This link expires in 24 hours.</p>
        </div>
      </div>
  `;

  const config = await getEmailConfig("reset_password", "Reset your Vertex International password", defaultHtml);
  const finalHtml = config.html
    .replace(/\{\{fullName\}\}/g, fullName)
    .replace(/\{\{resetUrl\}\}/g, resetUrl);

  await transporter.sendMail({ from: FROM, to: email, subject: config.subject, html: finalHtml });
}

// Invites a recruiter-sourced candidate lead (SRS FR-2.1) to create their
// own account once a recruiter has screened them — linking to their
// existing Candidate record so they can browse real jobs and submit a
// genuine application themselves, rather than the recruiter's manual
// status change being the only record of "submitted."
export async function sendCandidateInviteEmail(candidateId: string, to: string, name: string) {
  const token = signCandidateInviteToken(candidateId);
  const registerUrl = `${APP_URL}/auth/register?invite=${token}`;

  const defaultHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">You're a Step Closer</h1>
      </div>
      <div style="padding: 32px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">Hello {{name}},</p>
        <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">
          Your Vertex International recruiter has reviewed your details and confirmed you're ready for the next
          step. Create your own free account to browse available positions and submit your application directly.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${registerUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Create My Account</a>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">This link expires in 7 days. If you're not ready yet, your recruiter can still submit an application on your behalf.</p>
      </div>
    </div>
  `;

  const config = await getEmailConfig("candidate_invite", "You're ready to apply — create your Vertex account", defaultHtml);
  const finalHtml = config.html.replace(/\{\{name\}\}/g, name).replace(/\{\{registerUrl\}\}/g, registerUrl);

  await transporter.sendMail({ from: FROM, to, subject: config.subject, html: finalHtml });
}

export async function sendApplicationConfirmationEmail(to: string, name: string, jobTitle: string) {
  const defaultHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Application Received</h1>
      </div>
      <div style="padding: 32px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">Hello {{name}},</p>
        <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">
          Thank you for applying for the <strong>{{jobTitle}}</strong> position through Vertex International Recruitment.
        </p>
        <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">
          We have successfully received your application, CV, and documentation. Our team is currently reviewing it.
          You can track your application status at any time from your candidate dashboard.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Dashboard</a>
        </div>
      </div>
    </div>
  `;

  const config = await getEmailConfig("application_received", `Application Received: ${jobTitle}`, defaultHtml);
  const finalHtml = config.html
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{jobTitle\}\}/g, jobTitle);

  try {
    await transporter.sendMail({ from: FROM, to, subject: config.subject, html: finalHtml });
  } catch (error) {
    console.error("Error sending application confirmation:", error);
  }
}

export async function sendStatusUpdateEmail(to: string, name: string, jobTitle: string, newStatus: string) {
  const friendlyStatus = newStatus.replace("_", " ").toUpperCase();
  const defaultHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Application Update</h1>
      </div>
      <div style="padding: 32px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">Hello {{name}},</p>
        <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">
          There has been an update regarding your application for the <strong>{{jobTitle}}</strong> position.
        </p>
        <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 14px; color: #64748b; text-transform: uppercase; font-weight: bold;">New Status</span>
          <div style="font-size: 20px; color: #0f172a; font-weight: bold; margin-top: 4px;">{{friendlyStatus}}</div>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Dashboard</a>
        </div>
      </div>
    </div>
  `;

  const config = await getEmailConfig("application_status", `Update on your application: ${jobTitle}`, defaultHtml);
  const finalHtml = config.html
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{jobTitle\}\}/g, jobTitle)
    .replace(/\{\{friendlyStatus\}\}/g, friendlyStatus);

  try {
    await transporter.sendMail({ from: FROM, to, subject: config.subject, html: finalHtml });
  } catch (error) {
    console.error("Error sending status update:", error);
  }
}

export async function sendInterviewInvitationEmail(to: string, name: string, jobTitle: string, interviewDate: Date) {
  const formattedDate = new Date(interviewDate).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
  const defaultHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Interview Invitation</h1>
      </div>
      <div style="padding: 32px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">Hello {{name}},</p>
        <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">
          We are pleased to invite you to an interview for the <strong>{{jobTitle}}</strong> position.
        </p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 6px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 14px; color: #166534; text-transform: uppercase; font-weight: bold;">Scheduled For</span>
          <div style="font-size: 20px; color: #14532d; font-weight: bold; margin-top: 4px;">{{formattedDate}}</div>
        </div>
        <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">
          Please log in to your dashboard for more details or reply to this email if you need to reschedule.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Dashboard</a>
        </div>
      </div>
    </div>
  `;

  const config = await getEmailConfig("interview_invitation", `Interview Invitation: ${jobTitle}`, defaultHtml);
  const finalHtml = config.html
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{jobTitle\}\}/g, jobTitle)
    .replace(/\{\{formattedDate\}\}/g, formattedDate);

  try {
    await transporter.sendMail({ from: FROM, to, subject: config.subject, html: finalHtml });
  } catch (error) {
    console.error("Error sending interview invitation:", error);
  }
}

// SRS FR-4.8 — automated stage-based notification to the candidate on a
// mobility-case stage change.
export async function sendCaseStageUpdateEmail(to: string, name: string, jobTitle: string, newStage: string) {
  const friendlyStage = newStage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const defaultHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #03120d; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Your Case Has Moved Forward</h1>
      </div>
      <div style="padding: 32px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">Hello {{name}},</p>
        <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">
          Your placement case for the <strong>{{jobTitle}}</strong> position has moved to a new stage.
        </p>
        <div style="background-color: #fbf9f4; padding: 16px; border-radius: 6px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 14px; color: #64748b; text-transform: uppercase; font-weight: bold;">Current Stage</span>
          <div style="font-size: 20px; color: #03120d; font-weight: bold; margin-top: 4px;">{{friendlyStage}}</div>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${APP_URL}/dashboard" style="background-color: #d4af5c; color: #03120d; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Your Case</a>
        </div>
      </div>
    </div>
  `;

  const config = await getEmailConfig("case_stage_update", `Update on your placement: ${jobTitle}`, defaultHtml);
  const finalHtml = config.html
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{jobTitle\}\}/g, jobTitle)
    .replace(/\{\{friendlyStage\}\}/g, friendlyStage);

  try {
    await transporter.sendMail({ from: FROM, to, subject: config.subject, html: finalHtml });
  } catch (error) {
    console.error("Error sending case stage update:", error);
  }
}
