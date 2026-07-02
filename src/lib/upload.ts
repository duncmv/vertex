import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "./supabase";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

const MAX_FILE_SIZE = (Number(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024;

export async function saveUploadedFile(
  file: File,
  subfolder: "cv" | "passport"
): Promise<string> {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Only PDF, JPEG, and PNG are allowed.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 5}MB.`);
  }

  const ext = file.name.split(".").pop() || "bin";
  const uniqueName = `${uuidv4()}.${ext}`;
  const filePath = `${subfolder}/${uniqueName}`;

  const { data, error } = await supabase.storage
    .from("vertex-documents")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Supabase storage error:", error);
    throw new Error("Failed to upload file to storage.");
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("vertex-documents")
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

export async function deleteUploadedFile(publicPath: string): Promise<void> {
  try {
    const fullPath = path.join(process.cwd(), "public", publicPath);
    await fs.unlink(fullPath);
  } catch {
    // File may already be deleted — ignore
  }
}
