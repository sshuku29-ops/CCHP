import "server-only";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Small-file storage for assignment attachments.
 * Default adapter writes to UPLOAD_DIR on local disk. On ephemeral hosts
 * (Vercel) swap the three functions below for an S3-compatible client
 * (e.g. Cloudflare R2) — the rest of the app only uses this module.
 */
export const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "ppt", "pptx", "txt", "md", "png", "jpg", "jpeg"];
export const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
]);

export function maxUploadBytes() {
  return Number(process.env.MAX_UPLOAD_MB ?? 10) * 1024 * 1024;
}

function uploadDir() {
  return path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
}

export function validateUpload(file: File): string | null {
  if (file.size === 0) return "File is empty.";
  if (file.size > maxUploadBytes()) return `File is larger than ${process.env.MAX_UPLOAD_MB ?? 10} MB.`;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) return `File type .${ext} is not allowed.`;
  if (file.type && !ALLOWED_MIME.has(file.type)) return "File type is not allowed.";
  return null;
}

export async function storeUpload(file: File): Promise<{ key: string; name: string; size: number }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const key = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), key), Buffer.from(await file.arrayBuffer()));
  return { key, name: file.name.slice(0, 200), size: file.size };
}

export async function readUpload(key: string): Promise<Buffer | null> {
  if (!/^[A-Za-z0-9._-]+$/.test(key)) return null; // never allow path traversal
  try {
    return await readFile(path.join(uploadDir(), key));
  } catch {
    return null;
  }
}

export async function deleteUpload(key: string) {
  if (!/^[A-Za-z0-9._-]+$/.test(key)) return;
  await unlink(path.join(uploadDir(), key)).catch(() => {});
}
