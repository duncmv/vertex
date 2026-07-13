import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { put, del, get } from "@vercel/blob";
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

// Vercel's serverless functions don't have a persistent local filesystem —
// each invocation can run in a fresh container, and even within one, local
// writes don't survive or share across instances — so local disk storage
// silently doesn't work there. The real production/staging target
// (cPanel Node hosting, which does have a persistent disk) keeps local
// disk + R2 backup exactly as before; a demo deployment on Vercel uses
// Vercel Blob instead. Gated on both process.env.VERCEL (set
// automatically by Vercel in every deployment) and the token's presence,
// so cPanel never accidentally uses Blob even if a token is mistakenly
// left in its environment.
const useVercelBlob = Boolean(process.env.VERCEL) && Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export class DocumentNotFoundError extends Error {}

function resolveWithinStorageRoot(storagePath: string): string {
  const resolved = path.resolve(STORAGE_ROOT, storagePath);
  if (!resolved.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error("Invalid storage path.");
  }
  return resolved;
}

// A Blob-backed document's storage_path is its full Blob URL (fully
// qualified); a local-disk one is always a bare relative path — a cheap,
// sufficient discriminator without needing a separate "storage driver"
// column on Document, and one that keeps working through any future
// transition where old rows are on disk and new ones are on Blob.
function isBlobUrl(storagePath: string): boolean {
  return storagePath.startsWith("https://") || storagePath.startsWith("http://");
}

/**
 * Saves a candidate document to private storage and returns its storage
 * path. Never returns a public URL — callers must request a short-lived
 * signed URL via getSignedDocumentUrl to view it. On Vercel Blob this
 * uses real `access: 'private'` (genuine auth-gated access, not just an
 * unguessable public URL) — the token-holding server is the only thing
 * that can ever read it back, via resolveDocumentContent below, same as
 * local disk being outside /public.
 */
export async function saveUploadedFile(
  file: File,
  type: string
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

  if (useVercelBlob) {
    const blob = await put(storagePath, file, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN });
    return blob.url;
  }

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

export interface ResolvedDocument {
  buffer: Buffer;
  extension: string;
}

/**
 * Resolves a signed document token to its actual bytes, self-healing from
 * the R2 backup if a local copy is ever missing (SRS NFR-7 "tested
 * restores") — Blob-backed documents skip that path entirely since Blob
 * is itself the durable, managed store. Throws if the token is invalid/
 * expired, resolves outside the storage root, or isn't recoverable from
 * either copy.
 */
export async function resolveDocumentContent(token: string): Promise<ResolvedDocument> {
  const { storagePath } = verifyDocumentToken(token);
  const extension = (storagePath.split(".").pop() || "bin").toLowerCase();

  if (isBlobUrl(storagePath)) {
    const result = await get(storagePath, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!result || result.statusCode !== 200) throw new DocumentNotFoundError("Document not found in blob storage.");
    const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
    return { buffer, extension };
  }

  const absolutePath = resolveWithinStorageRoot(storagePath);
  try {
    return { buffer: await fs.readFile(absolutePath), extension };
  } catch {
    const restored = await restoreFromR2(storagePath, absolutePath);
    if (!restored) throw new DocumentNotFoundError("Document not found in primary or backup storage.");
    return { buffer: await fs.readFile(absolutePath), extension };
  }
}

export async function deleteUploadedFile(storagePath: string): Promise<void> {
  if (isBlobUrl(storagePath)) {
    try {
      await del(storagePath, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch (err) {
      console.error("Blob delete failed for", storagePath, err);
    }
    return;
  }

  try {
    await fs.unlink(resolveWithinStorageRoot(storagePath));
  } catch {
    // File may already be deleted locally — ignore
  }
  await deleteFromR2(storagePath);
}
