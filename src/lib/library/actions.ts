"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionModule } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { cleanHtml } from "@/lib/html/sanitize";
import { validateUpload } from "@/lib/uploads";
import { createDocumentFromFile, deleteDocument } from "@/lib/documents";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/action-result";
import { LIBRARY_CATEGORIES, LIBRARY_FILE_CATEGORIES } from "./categories";
import { uniqueSlug } from "./queries";

/**
 * Server actions for the Library (editable pages + uploaded files).
 * Every write requires an admin with the Training (lms) module. Volunteers only read.
 */

const MAX_BODY = 500_000; // ~500 KB of HTML per page is plenty

/** Empty editor output looks like "<p><br></p>" — treat anything without text as empty. */
function htmlOrEmpty(raw: unknown) {
  const html = cleanHtml(String(raw ?? ""));
  const text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  return text ? html : "";
}

const pageSchema = z.object({
  title: z.string().trim().min(2, "Give the page a title.").max(200, "Keep the title under 200 characters."),
  category: z.enum(LIBRARY_CATEGORIES, { message: "Pick a category." }),
  body: z.string().max(MAX_BODY, "That page is too long."),
  // Checkbox: present ("1") when ticked, absent when not.
  isPublished: z.string().optional().transform((v) => v === "1"),
});

function revalidateLibrary(slug?: string) {
  revalidatePath("/library");
  if (slug) revalidatePath(`/library/${slug}`);
  revalidatePath("/courses", "layout"); // module pages link to library pages by title
}

export async function createPageAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await actionModule("lms");
  const parsed = pageSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const body = htmlOrEmpty(parsed.data.body);
  if (!body) return { fieldErrors: { body: "Write something in the page body." } };
  const slug = await uniqueSlug(parsed.data.title);
  const page = await db.libraryPage.create({
    data: { slug, title: parsed.data.title, category: parsed.data.category, body, isPublished: parsed.data.isPublished, updatedById: user.id },
    select: { slug: true, id: true },
  });
  await audit(user.id, "library.page.create", page.id, { slug });
  revalidateLibrary(slug);
  redirect(`/library/${slug}`);
}

export async function updatePageAction(id: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await actionModule("lms");
  const existing = await db.libraryPage.findUnique({ where: { id }, select: { slug: true } });
  if (!existing) return { error: "Page not found." };
  const parsed = pageSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const body = htmlOrEmpty(parsed.data.body);
  if (!body) return { fieldErrors: { body: "Write something in the page body." } };
  await db.libraryPage.update({
    where: { id },
    data: { title: parsed.data.title, category: parsed.data.category, body, isPublished: parsed.data.isPublished, updatedById: user.id },
  });
  await audit(user.id, "library.page.update", id);
  revalidateLibrary(existing.slug);
  redirect(`/library/${existing.slug}`);
}

/** One-click delete (behind <ConfirmButton>). Module resources that pointed here keep their label but lose the link. */
export async function deletePageAction(id: string) {
  const user = await actionModule("lms");
  const page = await db.libraryPage.findUnique({ where: { id }, select: { slug: true } });
  if (!page) return { error: "Page not found." };
  await db.libraryPage.delete({ where: { id } });
  await audit(user.id, "library.page.delete", id, { slug: page.slug });
  revalidateLibrary(page.slug);
  redirect("/library");
}

const uploadSchema = z.object({
  title: z.string().trim().max(200, "Keep the title under 200 characters.").optional(),
  category: z.enum(LIBRARY_FILE_CATEGORIES, { message: "Pick a category." }),
});

/** "Upload a file" on /library: stores the file and creates a Document row (TRAINING or GENERAL). */
export async function uploadLibraryFileAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await actionModule("lms");
  const parsed = uploadSchema.safeParse({ title: fd.get("title") ?? "", category: fd.get("category") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { fieldErrors: { file: "Choose a file to upload." } };
  const problem = validateUpload(file);
  if (problem) return { fieldErrors: { file: problem } };
  const doc = await createDocumentFromFile(file, { title: parsed.data.title, category: parsed.data.category, uploadedById: user.id });
  await audit(user.id, "library.file.upload", doc.id, { fileName: doc.fileName });
  revalidateLibrary();
  return { ok: true, message: "File uploaded." };
}

/** Remove a library file (and its stored bytes). Only TRAINING/GENERAL documents can be removed here. */
export async function deleteLibraryFileAction(id: string) {
  const user = await actionModule("lms");
  const doc = await db.document.findUnique({ where: { id }, select: { category: true, certificate: { select: { id: true } } } });
  if (!doc) return { error: "File not found." };
  if (!(LIBRARY_FILE_CATEGORIES as readonly string[]).includes(doc.category) || doc.certificate) {
    return { error: "This file is managed elsewhere and cannot be removed from the library." };
  }
  await deleteDocument(id);
  await audit(user.id, "library.file.delete", id);
  revalidateLibrary();
  return { ok: true };
}
