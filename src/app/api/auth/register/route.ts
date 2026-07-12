import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { registerSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { verifyCandidateInviteToken } from "@/lib/jwt";

// Shared by GET (prefill) and POST (actual account creation) — a
// candidate account only ever comes into being via this invite, so both
// need the same "is this token still claimable, and what does the
// Candidate record already know about this person" lookup.
async function lookupClaimableInvite(token: string) {
  const { candidateId } = verifyCandidateInviteToken(token);
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: {
      id: true,
      user_id: true,
      full_name: true,
      email: true,
      phone: true,
      lifecycle_status: true,
      applications: {
        orderBy: { submitted_at: "desc" },
        take: 1,
        select: { current_location_country: { select: { name: true } } },
      },
    },
  });
  if (!candidate || candidate.user_id) return null;
  return candidate;
}

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

  let candidate;
  try {
    candidate = await lookupClaimableInvite(token);
  } catch {
    return NextResponse.json({ error: "This invite link is invalid or has expired." }, { status: 400 });
  }
  if (!candidate) {
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

// POST /api/auth/register — there's no general-purpose sign-up anymore:
// every candidate account is created off a screening invite (Candidate
// Information Form -> screened -> invite -> set password here), never
// from scratch. full_name/email/phone/country all come from the
// Candidate record the invite token points at, not from the request
// body, so there's no way to register with details that don't match
// what was actually screened.
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

  const { password, invite } = parsed.data;

  let candidate;
  try {
    candidate = await lookupClaimableInvite(invite);
  } catch {
    return NextResponse.json({ error: "This invite link is invalid or has expired." }, { status: 400 });
  }
  if (!candidate) {
    return NextResponse.json({ error: "This invite has already been used or is no longer valid." }, { status: 410 });
  }
  if (!candidate.email || !candidate.full_name) {
    return NextResponse.json(
      { error: "Your candidate record is missing required details. Please contact your recruiter." },
      { status: 422 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: candidate.email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Please log in instead." },
      { status: 409 }
    );
  }

  const password_hash = await hashPassword(password);

  // Self-service creation — no authenticated actor, so actor_id is null.
  const db = auditedPrisma(null);
  const user = await db.user.create({
    data: {
      full_name: candidate.full_name,
      email: candidate.email,
      password_hash,
      phone: candidate.phone ?? undefined,
      country: candidate.applications[0]?.current_location_country?.name ?? undefined,
    },
    select: { id: true, full_name: true, email: true, role: true },
  });

  await db.candidate.update({
    where: { id: candidate.id },
    data: {
      user_id: user.id,
      // Claiming the invite is what "guided to apply" now means — the
      // candidate has created their own account and can go upload
      // documents (candidateLifecycle.ts treats this transition as
      // system-only, not something staff manually advance). Guarded so
      // this never clobbers a candidate a supervisor has already moved
      // further along by the time they get around to registering.
      ...(candidate.lifecycle_status === "screened" ? { lifecycle_status: "guided_to_apply" } : {}),
    },
  });

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
