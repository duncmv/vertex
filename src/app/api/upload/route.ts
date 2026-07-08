import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/upload";
import { getAuthUser, requireAuth } from "@/lib/api-auth";
import type { DocumentType } from "@prisma/client";

const ALLOWED_TYPES: DocumentType[] = ["cv", "passport"];

// POST /api/upload?type=cv|passport
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireAuth(user);
  if (guardRes) return guardRes;

  const fileType = req.nextUrl.searchParams.get("type") as DocumentType | null;
  if (!fileType || !ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json(
      { error: "Query param 'type' must be 'cv' or 'passport'." },
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

  const candidate = await prisma.candidate.findUnique({
    where: { user_id: user!.userId },
    select: { id: true },
  });
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

  return NextResponse.json({ documentId: document.id, message: "File uploaded successfully." });
}
