import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs/promises";

/**
 * Cloudflare R2 backup for candidate documents (SRS NFR-7: automated
 * backups with tested restores). Local disk on the cPanel Node host is the
 * primary store (fast, no extra network hop); R2 is a resilient backing
 * copy — the read path in upload.ts self-heals from it if a local file is
 * ever missing, which doubles as the "tested restore" path.
 *
 * Best-effort: a backup/restore failure never fails the primary local
 * operation, it's logged and surfaced only as a degraded-redundancy state.
 */

const R2_BUCKET = process.env.R2_BUCKET_NAME;
const r2Configured = Boolean(
  process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && R2_BUCKET
);

const r2 = r2Configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

export function isBackupConfigured(): boolean {
  return r2Configured;
}

export async function backupToR2(storagePath: string, localAbsolutePath: string): Promise<void> {
  if (!r2) return; // not configured — local disk remains the only copy until it is
  try {
    const body = await fs.readFile(localAbsolutePath);
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: storagePath,
        Body: body,
      })
    );
  } catch (err) {
    console.error("R2 backup failed for", storagePath, err);
  }
}

export async function deleteFromR2(storagePath: string): Promise<void> {
  if (!r2) return;
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: storagePath }));
  } catch (err) {
    console.error("R2 delete failed for", storagePath, err);
  }
}

/**
 * Fetches a document back from R2 and writes it to the given local path.
 * Used as a self-heal when the local copy is missing. Returns false if R2
 * isn't configured or doesn't have the object either.
 */
export async function restoreFromR2(storagePath: string, localAbsolutePath: string): Promise<boolean> {
  if (!r2) return false;
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: storagePath }));
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) return false;
    await fs.mkdir(localAbsolutePath.substring(0, localAbsolutePath.lastIndexOf("/")), { recursive: true });
    await fs.writeFile(localAbsolutePath, bytes);
    return true;
  } catch (err) {
    console.error("R2 restore failed for", storagePath, err);
    return false;
  }
}
