import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { registerSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { verifyCandidateInviteToken } from "@/lib/jwt";

// GET /api/auth/register?invite=<token> — lets the register page prefill
// itself from the Candidate Information Form data already on file, so a
// screened candidate only has to set a password rather than retype
// everything a recruiter/the candidate themself already submitted.
// Public (no session yet) — the invite token itself is the credential.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("invite");
  if (!token) {
    return NextResponse.json({ error: "Missing invite token." }, { status: 400 });
  }

  let candidateId: string;
  try {
    ({ candidateId } = verifyCandidateInviteToken(token));
  } catch {
    return NextResponse.json({ error: "This invite link is invalid or has expired." }, { status: 400 });
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: {
      user_id: true,
      full_name: true,
      email: true,
      phone: true,
      applications: {
        orderBy: { submitted_at: "desc" },
        take: 1,
        select: { current_location_country: { select: { name: true } } },
      },
    },
  });

  if (!candidate || candidate.user_id) {
    return NextResponse.json({ error: "This invite has already been used or is no longer valid." }, { status: 410 });
  }

  return NextResponse.json({
    data: {
      full_name: candidate.full_name ?? "",
      email: candidate.email ?? "",
      phone: candidate.phone ?? "",
      country: candidate.applications[0]?.current_location_country?.name ?? "",
    },
  });
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 registrations per minute per IP
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`register:${ip}`, { max: 5 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { full_name, email, password, phone, country, invite } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const password_hash = await hashPassword(password);

  // A candidate-invite link (SRS FR-2.1) means this account should link to
  // the Candidate record a recruiter already built up, not create a blank
  // one. An invalid, expired, or already-claimed invite falls back to
  // normal self-registration rather than blocking the person entirely.
  let linkedCandidateId: string | null = null;
  let linkedCandidateLifecycleStatus: string | null = null;
  if (invite) {
    try {
      const { candidateId } = verifyCandidateInviteToken(invite);
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
        select: { id: true, user_id: true, lifecycle_status: true },
      });
      if (candidate && !candidate.user_id) {
        linkedCandidateId = candidate.id;
        linkedCandidateLifecycleStatus = candidate.lifecycle_status;
      }
    } catch {
      // Ignore — treat as a normal self-registration.
    }
  }

  // Self-service creation — no authenticated actor, so actor_id is null.
  const db = auditedPrisma(null);
  const user = await db.user.create({
    data: {
      full_name,
      email,
      password_hash,
      phone,
      country,
      ...(linkedCandidateId ? {} : { candidate: { create: {} } }),
    },
    select: { id: true, full_name: true, email: true, role: true },
  });

  if (linkedCandidateId) {
    await db.candidate.update({
      where: { id: linkedCandidateId },
      data: {
        user_id: user.id,
        // Claiming the invite is what "guided to apply" now means — the
        // candidate has created their own account and can go upload
        // documents (candidateLifecycle.ts treats this transition as
        // system-only, not something staff manually advance). Guarded so
        // this never clobbers a candidate a supervisor has already moved
        // further along by the time they get around to registering.
        ...(linkedCandidateLifecycleStatus === "screened" ? { lifecycle_status: "guided_to_apply" } : {}),
      },
    });
  }

  // Send verification email (non-blocking)
  sendVerificationEmail(user.id, user.email, user.full_name).catch(console.error);

  return NextResponse.json(
    {
      message: "Account created successfully. Please check your email to verify your account.",
      user,
    },
    { status: 201 }
  );
}
