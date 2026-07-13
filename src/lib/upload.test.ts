import { describe, it, expect, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import {
  saveUploadedFile,
  getSignedDocumentUrl,
  resolveDocumentContent,
  deleteUploadedFile,
  DocumentNotFoundError,
} from "./upload";
import { verifyDocumentToken, signDocumentToken } from "./jwt";

const TEST_STORAGE_ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR!);

async function cleanup() {
  await fs.rm(TEST_STORAGE_ROOT, { recursive: true, force: true });
}

afterEach(cleanup);

function makeFile(name: string, content = "test file bytes"): File {
  return new File([content], name, { type: "application/pdf" });
}

describe("saveUploadedFile / getSignedDocumentUrl / resolveDocumentContent", () => {
  it("saves a file and returns a storage path scoped by document type", async () => {
    const storagePath = await saveUploadedFile(makeFile("cv.pdf"), "cv");
    expect(storagePath).toMatch(/^cv\/.+\.pdf$/);

    const written = await fs.readFile(path.join(TEST_STORAGE_ROOT, storagePath), "utf-8");
    expect(written).toBe("test file bytes");
  });

  it("rejects disallowed mime types", async () => {
    const badFile = new File(["x"], "malware.exe", { type: "application/x-msdownload" });
    await expect(saveUploadedFile(badFile, "cv")).rejects.toThrow(/Invalid file type/);
  });

  it("round-trips a signed URL back to the correct file content", async () => {
    const storagePath = await saveUploadedFile(makeFile("passport.pdf"), "passport");
    const url = await getSignedDocumentUrl(storagePath, 60);
    const token = new URL(url, "http://localhost").searchParams.get("token")!;

    const { buffer, extension } = await resolveDocumentContent(token);
    expect(buffer.toString("utf-8")).toBe("test file bytes");
    expect(extension).toBe("pdf");
  });

  it("rejects a token whose storage path escapes the storage root", async () => {
    const forgedToken = signDocumentToken({ storagePath: "../../../../etc/passwd" }, 60);
    await expect(resolveDocumentContent(forgedToken)).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const storagePath = await saveUploadedFile(makeFile("cv.pdf"), "cv");
    const expiredToken = signDocumentToken({ storagePath }, -1);
    await expect(resolveDocumentContent(expiredToken)).rejects.toThrow();
    // sanity: verifyDocumentToken itself is what throws for expiry
    expect(() => verifyDocumentToken(expiredToken)).toThrow();
  });

  it("throws DocumentNotFoundError when the file is missing and no backup is configured", async () => {
    const storagePath = await saveUploadedFile(makeFile("cv.pdf"), "cv");
    await fs.unlink(path.join(TEST_STORAGE_ROOT, storagePath));

    const url = await getSignedDocumentUrl(storagePath, 60);
    const token = new URL(url, "http://localhost").searchParams.get("token")!;

    await expect(resolveDocumentContent(token)).rejects.toThrow(DocumentNotFoundError);
  });
});

describe("deleteUploadedFile", () => {
  it("removes the file from local storage", async () => {
    const storagePath = await saveUploadedFile(makeFile("cv.pdf"), "cv");
    const absolutePath = path.join(TEST_STORAGE_ROOT, storagePath);

    await expect(fs.access(absolutePath)).resolves.toBeUndefined();
    await deleteUploadedFile(storagePath);
    await expect(fs.access(absolutePath)).rejects.toThrow();
  });

  it("does not throw when the file is already gone", async () => {
    await expect(deleteUploadedFile("cv/does-not-exist.pdf")).resolves.toBeUndefined();
  });
});
