import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { getAuthUser, requireAuth } from "@/lib/api-auth";
import { sendCandidateMessageNotificationEmail } from "@/lib/email";

// One continuous thread per candidate (2026-07-13, confirmed with the
// business) — not split per-Application or per-Case, so it carries
// through whether the candidate is still applying or already has a case
// open. Scoped to exactly the two people who need to talk: the candidate
// themself and their currently-assigned recruiter (plus admin, same
// fail-safe access admin has everywhere else) — not a general
// staff-visible channel like RecruiterNote.
async function resolveAccess(userId: string, role: string, candidateId: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { user_id: true, recruiter_id: true },
  });
  if (!candidate) return { allowed: false as const, candidate: null };

  const allowed = role === "admin" || candidate.user_id === userId || candidate.recruiter_id === userId;
  return { allowed, candidate };
}

// GET /api/candidates/:id/messages
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  const guardRes = requireAuth(user);
  if (guardRes) return guardRes;

  const { id } = await params;
  const { allowed, candidate } = await resolveAccess(user!.userId, user!.role, id);
  if (!candidate) {
    return NextResponse.json({ error: { code: "not_found", message: "Candidate not found." } }, { status: 404 });
  }
  if (!allowed) {
    return NextResponse.json({ error: { code: "forbidden", message: "Forbidden." } }, { status: 403 });
  }

  const messages = await prisma.candidateMessage.findMany({
    where: { candidate_id: id },
    select: { id: true, body: true, created_at: true, sender_id: true, sender: { select: { full_name: true, role: true } } },
    orderBy: { created_at: "asc" },
  });

  return NextResponse.json({ data: messages });
}

// POST /api/candidates/:id/messages
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  const guardRes = requireAuth(user);
  if (guardRes) return guardRes;

  const { id } = await params;
  const { allowed, candidate } = await resolveAccess(user!.userId, user!.role, id);
  if (!candidate) {
    return NextResponse.json({ error: { code: "not_found", message: "Candidate not found." } }, { status: 404 });
  }
  if (!allowed) {
    return NextResponse.json({ error: { code: "forbidden", message: "Forbidden." } }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON" } }, { status: 400 });
  }

  const text = (body as { body?: unknown }).body;
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: { code: "validation_error", message: "Message body is required." } }, { status: 422 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: { code: "validation_error", message: "Message is too long." } }, { status: 422 });
  }

  const message = await auditedPrisma(user!.userId).candidateMessage.create({
    data: { candidate_id: id, sender_id: user!.userId, body: text.trim() },
    select: { id: true, body: true, created_at: true, sender_id: true, sender: { select: { full_name: true, role: true } } },
  });

  // Notify whichever side didn't send this — the candidate's own email if
  // a staff member sent it, the recruiter's if the candidate did. Non-
  // blocking and best-effort, same pattern as every other notification
  // email in this app.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const isFromCandidate = candidate.user_id === user!.userId;
  const recipient = isFromCandidate
    ? candidate.recruiter_id
      ? await prisma.user.findUnique({ where: { id: candidate.recruiter_id }, select: { email: true, full_name: true } })
      : null
    : candidate.user_id
      ? await prisma.user.findUnique({ where: { id: candidate.user_id }, select: { email: true, full_name: true } })
      : null;
  if (recipient) {
    const viewUrl = isFromCandidate ? `${appUrl}/recruiter/candidates/${id}` : `${appUrl}/dashboard`;
    sendCandidateMessageNotificationEmail(recipient.email, recipient.full_name, viewUrl).catch(console.error);
  }

  return NextResponse.json({ data: message }, { status: 201 });
}
