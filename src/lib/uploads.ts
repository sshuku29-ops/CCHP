import "server-only";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * File storage for everything uploaded to the platform: assignment files,
 * profile photos, partner logos, brochures and other documents.
 *
 * Two adapters, chosen by environment variables:
 *  - Supabase Storage (production on Vercel): set SUPABASE_URL,
 *    SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET (private bucket).
 *  - Local disk (development): UPLOAD_DIR (default ./uploads).
 * Files are always served through /api/files/[key], which checks access, so
 * the bucket itself stays private.
 */
export const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "ppt", "pptx", "txt", "md", "png", "jpg", "jpeg", "webp", "gif", "svg"];
export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"];
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
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);
export const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};
const SAFE_KEY = /^[A-Za-z0-9._-]+$/;

export function maxUploadBytes() {
  return Number(process.env.MAX_UPLOAD_MB ?? 10) * 1024 * 1024;
}
export function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}
export function contentTypeForKey(key: string) {
  return CONTENT_TYPES[extensionOf(key)] ?? "application/octet-stream";
}
export function isSafeKey(key: string) {
  return SAFE_KEY.test(key);
}

/** Validate a browser File. `allowed` narrows the extension list (e.g. images only). */
export function validateUpload(file: File, allowed: string[] = ALLOWED_EXTENSIONS, maxBytes = maxUploadBytes()): string | null {
  if (file.size === 0) return "File is empty.";
  if (file.size > maxBytes) return `File is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  const ext = extensionOf(file.name);
  if (!allowed.includes(ext)) return `File type .${ext || "?"} is not allowed.`;
  if (file.type && !ALLOWED_MIME.has(file.type)) return "File type is not allowed.";
  return null;
}

function useSupabase() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
async function supabaseBucket() {
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  return client.storage.from(process.env.SUPABASE_STORAGE_BUCKET ?? "cchp-files");
}
function uploadDir() {
  return path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
}
export function newKey(ext: string) {
  return `${Date.now()}-${randomBytes(8).toString("hex")}.${ext.toLowerCase()}`;
}

/** Store raw bytes under a new key. */
export async function storeBytes(bytes: Uint8Array | Buffer, ext: string, contentType?: string): Promise<string> {
  const key = newKey(ext);
  if (useSupabase()) {
    const bucket = await supabaseBucket();
    const { error } = await bucket.upload(key, bytes, { contentType: contentType ?? contentTypeForKey(key), upsert: false });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return key;
  }
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), key), bytes);
  return key;
}

/** Store a browser File (already validated). */
export async function storeUpload(file: File): Promise<{ key: string; name: string; size: number; mime: string }> {
  const ext = extensionOf(file.name) || "bin";
  const key = await storeBytes(Buffer.from(await file.arrayBuffer()), ext, file.type || undefined);
  return { key, name: file.name.slice(0, 200), size: file.size, mime: file.type || contentTypeForKey(key) };
}

export async function readUpload(key: string): Promise<Buffer | null> {
  if (!isSafeKey(key)) return null; // never allow path traversal
  if (useSupabase()) {
    const bucket = await supabaseBucket();
    const { data, error } = await bucket.download(key);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }
  try {
    return await readFile(path.join(uploadDir(), key));
  } catch {
    return null;
  }
}

export async function deleteUpload(key: string) {
  if (!isSafeKey(key)) return;
  if (useSupabase()) {
    const bucket = await supabaseBucket();
    await bucket.remove([key]);
    return;
  }
  await unlink(path.join(uploadDir(), key)).catch(() => {});
}
