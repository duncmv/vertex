import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import type { DocumentType } from "@prisma/client";
import { signDocumentToken, verifyDocumentToken } from "./jwt";
import { backupToR2, deleteFromR2, restoreFromR2 } from "./backup";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

const MAX_FILE_SIZE = (Number(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024;
const DEFAULT_SIGNED_URL_TTL_SECONDS = 300; // 5 minutes

// Deliberately NOT under /public — anything in /public is served statically
// by Next.js with no access control at all (SRS FR-1.6).
const STORAGE_ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "./storage/documents");

export class DocumentNotFoundError extends Error {}

function resolveWithinStorageRoot(storagePath: string): string {
  const resolved = path.resolve(STORAGE_ROOT, storagePath);
  if (!resolved.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error("Invalid storage path.");
  }
  return resolved;
}

/**
 * Saves a candidate document to the private, non-public storage directory
 * and returns its storage path. Never returns a public URL — callers must
 * request a short-lived signed URL via getSignedDocumentUrl to view it.
 */
export async function saveUploadedFile(
  file: File,
  type: DocumentType
): Promise<string> {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Only PDF, JPEG, and PNG are allowed.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 5}MB.`);
  }

  const ext = file.name.split(".").pop() || "bin";
  const uniqueName = `${uuidv4()}.${ext}`;
  const storagePath = `${type}/${uniqueName}`;
  const absolutePath = resolveWithinStorageRoot(storagePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  // Best-effort backup — never fails the upload if R2 is unavailable.
  await backupToR2(storagePath, absolutePath);

  return storagePath;
}

/**
 * Generates a short-lived signed URL for a private document. Call this
 * on-demand at view time — never cache or persist the result.
 */
export async function getSignedDocumentUrl(
  storagePath: string,
  expiresInSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string> {
  const token = signDocumentToken({ storagePath }, expiresInSeconds);
  return `/api/documents/file?token=${encodeURIComponent(token)}`;
}

/**
 * Resolves a signed document token to an absolute filesystem path, self-
 * healing from the R2 backup if the local copy is ever missing (SRS NFR-7
 * "tested restores"). Throws if the token is invalid/expired, resolves
 * outside the storage root, or the file isn't recoverable from either copy.
 */
export async function resolveAndEnsureDocumentPath(token: string): Promise<string> {
  const { storagePath } = verifyDocumentToken(token);
  const absolutePath = resolveWithinStorageRoot(storagePath);

  try {
    await fs.access(absolutePath);
    return absolutePath;
  } catch {
    const restored = await restoreFromR2(storagePath, absolutePath);
    if (!restored) throw new DocumentNotFoundError("Document not found in primary or backup storage.");
    return absolutePath;
  }
}

export async function deleteUploadedFile(storagePath: string): Promise<void> {
  try {
    await fs.unlink(resolveWithinStorageRoot(storagePath));
  } catch {
    // File may already be deleted locally — ignore
  }
  await deleteFromR2(storagePath);
}
