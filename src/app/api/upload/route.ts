import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/upload";
import { getAuthUser, requireAuth } from "@/lib/api-auth";

// POST /api/upload?type=cv|passport
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireAuth(user);
  if (guardRes) return guardRes;

  const fileType = req.nextUrl.searchParams.get("type") as "cv" | "passport" | null;
  if (!fileType || !["cv", "passport"].includes(fileType)) {
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

  let fileUrl: string;
  try {
    fileUrl = await saveUploadedFile(file, fileType);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Update candidate profile
  const field = fileType === "cv" ? "cv_file" : "passport_scan";
  await prisma.candidate.update({
    where: { user_id: user!.userId },
    data: { [field]: fileUrl },
  });

  return NextResponse.json({ url: fileUrl, message: "File uploaded successfully." });
}
