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

// --- Brand shell ------------------------------------------------------
// Every email in the app renders through this — matches the site's own
// midnight/gold/ivory palette (globals.css) rather than a generic
// slate/blue template. Table-based structural bits (section headers,
// field rows) instead of flexbox/grid, since Outlook desktop's Word
// rendering engine doesn't support either; border-radius/box-shadow are
// used freely since they degrade gracefully there (square corners, no
// shadow) rather than breaking layout.
const BRAND = {
  midnight950: "#03120d",
  midnight900: "#062119",
  midnight800: "#0a3326",
  midnight700: "#104f36",
  ivory50: "#fbf9f4",
  ivory100: "#f5f1e8",
  gold300: "#e6cd85",
  gold400: "#d4af5c",
  gold600: "#a98634",
};
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

function emailLayout({ eyebrow, title, subtitle, bodyHtml }: { eyebrow?: string; title: string; subtitle?: string; bodyHtml: string }) {
  return `
  <div style="background:${BRAND.ivory100};padding:32px 16px;font-family:${FONT};">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(6,33,25,0.08);">
      <div style="background:${BRAND.midnight950};padding:36px 40px 32px;">
        <table role="presentation" style="border-collapse:collapse;">
          <tr>
            <td style="vertical-align:middle;padding-right:10px;">
              <img src="${APP_URL}/vertex-logo.png" width="26" height="26" alt="" style="display:block;border-radius:6px;" />
            </td>
            <td style="vertical-align:middle;">
              <span style="font-size:14px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.ivory50};">VERTEX <span style="color:${BRAND.gold400};">INTERNATIONAL</span></span>
            </td>
          </tr>
        </table>
        ${eyebrow ? `<div style="margin-top:24px;font-size:11px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:${BRAND.gold400};">${eyebrow}</div>` : ""}
        <div style="margin-top:${eyebrow ? "10" : "24"}px;font-size:24px;font-weight:600;letter-spacing:-0.01em;color:${BRAND.ivory50};line-height:1.25;">${title}</div>
        ${subtitle ? `<div style="margin-top:8px;font-size:14px;color:rgba(251,249,244,0.6);font-weight:300;">${subtitle}</div>` : ""}
      </div>
      <div style="padding:36px 40px;background:#ffffff;">
        ${bodyHtml}
      </div>
      <div style="padding:24px 40px;background:${BRAND.ivory100};border-top:1px solid rgba(6,33,25,0.08);">
        <div style="font-size:12px;color:rgba(6,33,25,0.55);line-height:1.6;">
          Vertex International Recruitment Ltd.<br />5 Brayford Square, London, E1 0SG, United Kingdom
        </div>
        <div style="font-size:11px;color:rgba(6,33,25,0.4);margin-top:10px;">
          © ${new Date().getFullYear()} Vertex International Recruitment. All rights reserved.
        </div>
      </div>
    </div>
  </div>`;
}

function goldButton(href: string, label: string) {
  return `<div style="text-align:center;margin:28px 0 8px;">
    <a href="${href}" style="display:inline-block;background:${BRAND.gold400};color:${BRAND.midnight950};padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">${label}</a>
  </div>`;
}

function statPill(label: string, value: string, tone: "ivory" | "green" = "ivory") {
  const bg = tone === "green" ? "#eef7f1" : BRAND.ivory100;
  const valueColor = tone === "green" ? BRAND.midnight700 : BRAND.midnight950;
  return `<div style="background:${bg};border-radius:10px;padding:18px;text-align:center;margin-bottom:24px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.gold600};">${label}</div>
    <div style="font-size:19px;font-weight:700;color:${valueColor};margin-top:6px;">${value}</div>
  </div>`;
}

const p = (html: string) => `<p style="font-size:15px;color:${BRAND.midnight900};line-height:1.65;margin:0 0 20px;">${html}</p>`;
const small = (html: string) => `<p style="font-size:13px;color:rgba(6,33,25,0.55);line-height:1.5;margin:0;">${html}</p>`;

export async function sendVerificationEmail(userId: string, email: string, fullName: string) {
  const token = signEmailToken({ userId, email, type: "email_verification" });
  const verifyUrl = `${APP_URL}/auth/verify-email?token=${token}`;

  const defaultHtml = emailLayout({
    eyebrow: "Account Verification",
    title: "Welcome, {{fullName}}.",
    bodyHtml: `
      ${p("Thank you for registering with Vertex International Recruitment. Please verify your email address to activate your account.")}
      ${goldButton("{{verifyUrl}}", "Verify Email Address")}
      ${small("This link expires in 24 hours. If you did not create an account, you can ignore this email.")}
    `,
  });

  const config = await getEmailConfig("welcome", "Verify your Vertex International account", defaultHtml);
  const finalHtml = config.html
    .replace(/\{\{fullName\}\}/g, fullName)
    .replace(/\{\{verifyUrl\}\}/g, verifyUrl);

  await transporter.sendMail({ from: FROM, to: email, subject: config.subject, html: finalHtml });
}

export async function sendPasswordResetEmail(userId: string, email: string, fullName: string) {
  const token = signEmailToken({ userId, email, type: "password_reset" });
  const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;

  const defaultHtml = emailLayout({
    eyebrow: "Account Security",
    title: "Reset your password",
    bodyHtml: `
      ${p("Hi {{fullName}}, click the button below to reset your password.")}
      ${goldButton("{{resetUrl}}", "Reset Password")}
      ${small("This link expires in 24 hours. If you didn't request this, you can safely ignore this email.")}
    `,
  });

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

  const defaultHtml = emailLayout({
    eyebrow: "Next Step",
    title: "You're a step closer, {{name}}.",
    bodyHtml: `
      ${p("Your Vertex International recruiter has reviewed your details and confirmed you're ready for the next step. Create your own free account to browse available programmes and submit your application directly.")}
      ${goldButton("{{registerUrl}}", "Create My Account")}
      ${small("This link expires in 7 days. If you're not ready yet, your recruiter can still submit an application on your behalf.")}
    `,
  });

  const config = await getEmailConfig("candidate_invite", "You're ready to apply — create your Vertex account", defaultHtml);
  const finalHtml = config.html.replace(/\{\{name\}\}/g, name).replace(/\{\{registerUrl\}\}/g, registerUrl);

  await transporter.sendMail({ from: FROM, to, subject: config.subject, html: finalHtml });
}

// hasAccount distinguishes a brand-new Candidate Information Form
// submission (no account exists yet — accounts are only created later,
// via the screening invite) from a re-submission by a candidate who
// already registered. Only the latter has anywhere to sign in to, so
// only it gets a dashboard link.
export async function sendApplicationConfirmationEmail(to: string, name: string, jobTitle: string, hasAccount: boolean) {
  const defaultHtml = emailLayout({
    eyebrow: "Candidate Information Form",
    title: "Application received",
    bodyHtml: hasAccount
      ? `
      ${p(`Hello {{name}}, thank you for applying for <strong>{{jobTitle}}</strong> through Vertex International Recruitment.`)}
      ${p("We've successfully received your application and documentation. Our team is reviewing it now — you can track its status at any time from your candidate dashboard.")}
      ${goldButton(`${APP_URL}/dashboard`, "View Dashboard")}
    `
      : `
      ${p(`Hello {{name}}, thank you for applying for <strong>{{jobTitle}}</strong> through Vertex International Recruitment.`)}
      ${p("We've successfully received your application. Your submission is now under review — there's nothing further for you to do at this stage. Once our team has reviewed your details, we'll be in touch by email with next steps.")}
    `,
  });

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
  const defaultHtml = emailLayout({
    eyebrow: "Application Update",
    title: "Your application has moved",
    bodyHtml: `
      ${p(`Hello {{name}}, there's an update on your application for <strong>{{jobTitle}}</strong>.`)}
      ${statPill("New Status", "{{friendlyStatus}}")}
      ${goldButton(`${APP_URL}/dashboard`, "View Dashboard")}
    `,
  });

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
  const formattedDate = new Date(interviewDate).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
  const defaultHtml = emailLayout({
    eyebrow: "Interview Invitation",
    title: "You're invited to interview",
    bodyHtml: `
      ${p(`Hello {{name}}, we're pleased to invite you to an interview for <strong>{{jobTitle}}</strong>.`)}
      ${statPill("Scheduled For", "{{formattedDate}}", "green")}
      ${p("Please log in to your dashboard for more details, or reply to this email if you need to reschedule.")}
      ${goldButton(`${APP_URL}/dashboard`, "View Dashboard")}
    `,
  });

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
  const defaultHtml = emailLayout({
    eyebrow: "Case Update",
    title: "Your case has moved forward",
    bodyHtml: `
      ${p(`Hello {{name}}, your placement case for <strong>{{jobTitle}}</strong> has moved to a new stage.`)}
      ${statPill("Current Stage", "{{friendlyStage}}", "green")}
      ${goldButton(`${APP_URL}/dashboard`, "View Your Case")}
    `,
  });

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

// Staff-facing notification (SRS FR-5.1) — a partner submitted a candidate
// through its own portal. This candidate never enters Vertex's internal
// recruiter/screening funnel, so this email (plus the record itself) is
// currently the only signal staff have that one exists. Recipient is a
// business-provided address, not yet supplied — no-ops with a console note
// until PARTNER_SUBMISSION_NOTIFY_EMAIL is set, rather than throwing.
export async function sendPartnerCandidateSubmittedEmail(partnerName: string, candidateName: string) {
  const to = process.env.PARTNER_SUBMISSION_NOTIFY_EMAIL;
  if (!to) {
    console.log(`[partner-candidate] ${partnerName} submitted ${candidateName} — no PARTNER_SUBMISSION_NOTIFY_EMAIL configured, skipping notification email.`);
    return;
  }

  const html = emailLayout({
    eyebrow: "Partner Portal",
    title: "New partner candidate submission",
    bodyHtml: `
      ${p(`<strong>${partnerName}</strong> submitted a new candidate: <strong>${candidateName}</strong>.`)}
      ${small("Sign in to your Vertex portal to review it.")}
    `,
  });

  try {
    await transporter.sendMail({ from: FROM, to, subject: `New partner candidate: ${candidateName}`, html });
  } catch (error) {
    console.error("Error sending partner-candidate submission notification:", error);
  }
}

// --- Public-forms email bridge ---
// The site is being deployed to the main domain ahead of the CRM's staff
// workflows being fully signed off. Until an admin flips SystemSetting
// "intake_mode" to "crm" (src/app/api/public-intake/application/route.ts,
// src/app/api/contact/route.ts), the public Candidate Information Form and
// Contact form don't touch the CRM at all — they email a human directly.
// Unlike sendPartnerCandidateSubmittedEmail, a failure here throws instead
// of being swallowed: for these two routes the email *is* the entire
// submission, so the caller must know if it didn't go out.

export interface PublicIntakeEmailData {
  fullName: string;
  email: string;
  phone?: string;
  nationality?: string;
  passportNumber?: string;
  jobTitle?: string;
  preferredCountry1: string;
  preferredCountry2?: string;
  preferredCountry3?: string;
  preferredSector: string;
  earliestTravelDate: string;
  priorEuVisaApplied?: string;
  documentsAvailable: string[];
  currentLocationCountry: string;
  holdsSchengenVisa?: string;
  priorVisaRefusals?: string;
  availableForEmbassyAppointment: boolean;
  willingToStartWithin30Days: boolean;
  preferredContactChannel?: string;
  coverLetter?: string;
}

// Renders the CIF submission as an actual formatted document (numbered
// sections matching the real form's own 1-5 structure) rather than a flat
// notification table — this email *is* the record staff work from while
// intake_mode is "email", so it should read like the document itself,
// populated, not like an alert that one was filled in.
function docSectionHeader(num: string, title: string) {
  return `
    <table role="presentation" style="border-collapse:collapse;margin-bottom:2px;">
      <tr>
        <td style="width:24px;vertical-align:middle;">
          <div style="width:20px;height:20px;line-height:20px;text-align:center;font-size:11px;font-weight:700;color:${BRAND.ivory50};background:${BRAND.midnight950};border-radius:10px;">${num}</div>
        </td>
        <td style="vertical-align:middle;padding-left:8px;">
          <span style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.midnight900};">${title}</span>
        </td>
      </tr>
    </table>
    <div style="border-bottom:2px solid ${BRAND.gold400};margin:8px 0 14px;"></div>
  `;
}

function docField(label: string, value?: string | null) {
  if (!value) return "";
  return `
    <tr>
      <td style="padding:7px 0;border-bottom:1px solid ${BRAND.ivory100};vertical-align:top;width:46%;">
        <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${BRAND.gold600};">${label}</span>
      </td>
      <td style="padding:7px 0;border-bottom:1px solid ${BRAND.ivory100};vertical-align:top;font-size:14px;color:${BRAND.midnight900};font-weight:500;">${value}</td>
    </tr>
  `;
}

function docSection(num: string, title: string, rowsHtml: string) {
  if (!rowsHtml.trim()) return "";
  return `
    <div style="margin-bottom:26px;">
      ${docSectionHeader(num, title)}
      <table role="presentation" style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
    </div>
  `;
}

export async function sendPublicIntakeEmail(data: PublicIntakeEmailData) {
  const to = process.env.PUBLIC_FORMS_NOTIFY_EMAIL;
  if (!to) {
    // Unlike sendPartnerCandidateSubmittedEmail (a secondary notification
    // for a record that already exists in the DB either way), there is no
    // fallback record here at all — an unconfigured inbox means the
    // submission is gone with no trace. Throw so the caller returns a real
    // error instead of a false "success".
    throw new Error("PUBLIC_FORMS_NOTIFY_EMAIL is not configured.");
  }

  const documentsHtml = data.documentsAvailable.length
    ? data.documentsAvailable.map((d) => `<div style="font-size:14px;color:${BRAND.midnight900};padding:3px 0;">✓ ${d}</div>`).join("")
    : `<div style="font-size:13px;color:rgba(6,33,25,0.45);font-style:italic;">None selected</div>`;

  const bodyHtml = `
    <div style="background:${BRAND.ivory100};border-radius:10px;padding:14px 18px;margin-bottom:28px;">
      <span style="font-size:12px;color:${BRAND.midnight900};">Emailed directly — the CRM intake pipeline isn't live yet
      (Admin Settings → Public Form Intake Mode).</span>
    </div>

    ${docSection("1", "Programme Selection", `
      ${docField("Applying for", data.jobTitle)}
      ${docField("Preferred country — option 1", data.preferredCountry1)}
      ${docField("Preferred country — option 2", data.preferredCountry2)}
      ${docField("Preferred country — option 3", data.preferredCountry3)}
      ${docField("Preferred type of work", data.preferredSector)}
      ${docField("Earliest possible travel date", data.earliestTravelDate)}
      ${docField("Previously applied for an EU visa?", data.priorEuVisaApplied)}
    `)}

    ${docSection("2", "Candidate Personal Information", `
      ${docField("Full name", data.fullName)}
      ${docField("Email address", data.email)}
      ${docField("Phone number", data.phone)}
      ${docField("Nationality", data.nationality)}
      ${docField("Passport number", data.passportNumber)}
    `)}

    <div style="margin-bottom:26px;">
      ${docSectionHeader("3", "Document Checklist")}
      ${documentsHtml}
    </div>

    <div style="margin-bottom:26px;">
      ${docSectionHeader("4", "Payment Plan Acknowledgement")}
      <div style="display:inline-block;background:${BRAND.midnight800};color:${BRAND.gold300};font-size:12px;font-weight:600;padding:9px 18px;border-radius:999px;">
        ✓ Payment plan acknowledged (20% documentation / 40% permit / 40% visa)
      </div>
    </div>

    ${docSection("5", "Visa &amp; Travel Readiness", `
      ${docField("Current location", data.currentLocationCountry)}
      ${docField("Holds Schengen / EU visa?", data.holdsSchengenVisa)}
      ${docField("Prior visa refusals", data.priorVisaRefusals)}
      ${docField("Available for embassy appointment?", data.availableForEmbassyAppointment ? "Yes" : "No")}
      ${docField("Willing to start within 30 days?", data.willingToStartWithin30Days ? "Yes" : "No")}
      ${docField("Preferred contact channel", data.preferredContactChannel)}
    `)}

    ${data.coverLetter ? `<div style="margin-bottom:4px;">
      ${docSectionHeader("—", "Additional Notes")}
      <p style="font-size:14px;color:${BRAND.midnight900};line-height:1.6;white-space:pre-wrap;margin:0;">${data.coverLetter}</p>
    </div>` : ""}
  `;

  const html = emailLayout({
    eyebrow: "Candidate Information Form",
    title: data.fullName,
    subtitle: "European Work Permit &amp; Visa Application" + (data.jobTitle ? ` · ${data.jobTitle}` : ""),
    bodyHtml,
  });

  await transporter.sendMail({ from: FROM, to, subject: `New CIF submission: ${data.fullName}${data.jobTitle ? ` — ${data.jobTitle}` : ""}`, html });
}

export async function sendPublicIntakeConfirmationEmail(to: string, fullName: string) {
  const html = emailLayout({
    eyebrow: "Candidate Information Form",
    title: `Thank you, ${fullName}.`,
    bodyHtml: p("We've received your Candidate Information Form. A member of our team will review it and get in touch within 1–2 business days to confirm your programme and next steps."),
  });
  await transporter.sendMail({ from: FROM, to, subject: "We've received your application — Vertex International", html });
}

export interface ContactMessageData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function sendContactMessageEmail(data: ContactMessageData) {
  const to = process.env.PUBLIC_FORMS_NOTIFY_EMAIL;
  if (!to) {
    // Same reasoning as sendPublicIntakeEmail: no DB fallback record
    // exists for a contact message, so an unconfigured inbox must fail
    // loudly rather than silently discard the message.
    throw new Error("PUBLIC_FORMS_NOTIFY_EMAIL is not configured.");
  }

  const html = emailLayout({
    eyebrow: "Contact Form",
    title: data.subject,
    subtitle: `From ${data.name} · ${data.email}`,
    bodyHtml: `
      <p style="font-size:13px;color:rgba(6,33,25,0.5);margin:0 0 6px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">Message</p>
      <p style="font-size:15px;color:${BRAND.midnight900};white-space:pre-wrap;line-height:1.65;margin:0;">${data.message}</p>
    `,
  });

  await transporter.sendMail({ from: FROM, to, replyTo: data.email, subject: `[Contact] ${data.subject}`, html });
}
