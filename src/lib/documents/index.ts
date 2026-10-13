import "server-only";
import { db } from "@/lib/db";
import { extensionOf, IMAGE_EXTENSIONS, storeUpload, storeBytes, deleteUpload, contentTypeForKey } from "@/lib/uploads";

export const DOCUMENT_CATEGORIES = ["SESSION_MATERIAL", "BROCHURE", "PHOTO", "TRAINING", "CERTIFICATE", "LOGO", "GENERAL"] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  SESSION_MATERIAL: "Session material (slides, outline)",
  BROCHURE: "Brochure",
  PHOTO: "Photo (volunteers only)",
  TRAINING: "Training handout",
  CERTIFICATE: "Certificate",
  LOGO: "Logo",
  GENERAL: "Other",
};

export function kindForExtension(ext: string): "PDF" | "IMAGE" | "OTHER" {
  if (ext === "pdf") return "PDF";
  if (IMAGE_EXTENSIONS.includes(ext) || ext === "svg") return "IMAGE";
  return "OTHER";
}

/** Create a Document row from a validated browser File. */
export async function createDocumentFromFile(
  file: File,
  meta: { title?: string; description?: string; category: DocumentCategory; isPublic?: boolean; sessionId?: string | null; moduleId?: string | null; uploadedById?: string | null },
) {
  const stored = await storeUpload(file);
  const ext = extensionOf(stored.key);
  return db.document.create({
    data: {
      title: meta.title?.trim() || file.name.replace(/\.[^.]+$/, ""),
      description: meta.description ?? null,
      kind: kindForExtension(ext),
      category: meta.category,
      fileKey: stored.key,
      fileName: stored.name,
      mimeType: stored.mime,
      size: stored.size,
      isPublic: meta.isPublic ?? false,
      sessionId: meta.sessionId ?? null,
      moduleId: meta.moduleId ?? null,
      uploadedById: meta.uploadedById ?? null,
    },
  });
}

/** Create a Document row from bytes we generated (certificates, imports). */
export async function createDocumentFromBytes(
  bytes: Uint8Array | Buffer,
  meta: { title: string; fileName: string; category: DocumentCategory; description?: string; isPublic?: boolean; sessionId?: string | null; moduleId?: string | null; uploadedById?: string | null },
) {
  const ext = extensionOf(meta.fileName) || "bin";
  const key = await storeBytes(bytes, ext);
  return db.document.create({
    data: {
      title: meta.title,
      description: meta.description ?? null,
      kind: kindForExtension(ext),
      category: meta.category,
      fileKey: key,
      fileName: meta.fileName,
      mimeType: contentTypeForKey(key),
      size: bytes.byteLength,
      isPublic: meta.isPublic ?? false,
      sessionId: meta.sessionId ?? null,
      moduleId: meta.moduleId ?? null,
      uploadedById: meta.uploadedById ?? null,
    },
  });
}

export async function deleteDocument(id: string) {
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc) return;
  await db.document.delete({ where: { id } });
  await deleteUpload(doc.fileKey);
}

/** URL that serves the file through the access-checked route. */
export function documentUrl(doc: { fileKey: string }) {
  return `/api/files/${doc.fileKey}`;
}
