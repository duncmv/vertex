import nodemailer from "nodemailer";
import { signEmailToken } from "./jwt";
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
