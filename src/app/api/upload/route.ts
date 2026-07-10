import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/upload";
import { getAuthUser, requireAuth } from "@/lib/api-auth";
import { canAccessCandidate } from "@/server/scope";
import { isStaffRole } from "@/lib/rbac";
import { evaluateDocumentCompletenessForCandidateId } from "@/server/services/documentCompleteness";

// POST /api/upload?type=<key>[&candidate_id=...]
// `type` is validated against the admin-managed DocumentRequirementType
// table (SRS FR-4.6's mobility-lifecycle set plus the Candidate
// Information Form's Section 3 checklist) rather than a fixed allowlist,
// so a type admin adds from the UI is immediately uploadable.
// Self-upload (no candidate_id) covers a candidate managing their own
// account. A recruiter/supervisor/admin passing candidate_id uploads on
// behalf of a recruiter-sourced lead who has no account yet (SRS FR-2.1,
// FR-2.5) — common in the field, where the recruiter is the one who
// physically collects and scans the candidate's documents.
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireAuth(user);
  if (guardRes) return guardRes;

  const fileType = req.nextUrl.searchParams.get("type");
  if (!fileType || !(await prisma.documentRequirementType.findUnique({ where: { key: fileType } }))) {
    return NextResponse.json(
      { error: "Query param 'type' must be a known document requirement type." },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const targetCandidateId = req.nextUrl.searchParams.get("candidate_id");

  let candidate: { id: string; lifecycle_status: string } | null;
  if (targetCandidateId) {
    if (!isStaffRole(user!.role)) {
      return NextResponse.json({ error: "Only staff can upload on behalf of a candidate." }, { status: 403 });
    }
    const full = await prisma.candidate.findUnique({
      where: { id: targetCandidateId },
      select: { id: true, user_id: true, recruiter_id: true, country_id: true, lifecycle_status: true },
    });
    if (!full) {
      return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
    }
    if (!(await canAccessCandidate(user!, full))) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    candidate = full;
  } else {
    candidate = await prisma.candidate.findUnique({
      where: { user_id: user!.userId },
      select: { id: true, lifecycle_status: true },
    });
  }

  if (!candidate) {
    return NextResponse.json({ error: "Candidate profile not found." }, { status: 404 });
  }

  let storagePath: string;
  try {
    storagePath = await saveUploadedFile(file, fileType);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const db = auditedPrisma(user!.userId);

  // A re-upload of the same document type supersedes the previous one.
  const existing = await prisma.document.findFirst({
    where: { candidate_id: candidate.id, type: fileType },
  });
  if (existing) {
    await deleteUploadedFile(existing.storage_path);
    await db.document.delete({ where: { id: existing.id } });
  }

  const document = await db.document.create({
    data: {
      candidate_id: candidate.id,
      type: fileType,
      storage_path: storagePath,
    },
  });

  // "Submitted" now means the candidate's required documents are all in
  // (they already submitted the Candidate Information Form itself at
  // "identified", long before any account or document existed) — this is
  // the system-only trigger candidateLifecycle.ts expects, so only fires
  // from guided_to_apply, never clobbering a candidate already further along.
  if (candidate.lifecycle_status === "guided_to_apply") {
    const completeness = await evaluateDocumentCompletenessForCandidateId(candidate.id);
    if (completeness.complete) {
      await db.candidate.update({ where: { id: candidate.id }, data: { lifecycle_status: "submitted" } });
    }
  }

  return NextResponse.json({ documentId: document.id, message: "File uploaded successfully." });
}
