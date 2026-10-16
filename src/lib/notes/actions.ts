"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionModule } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { cleanHtml } from "@/lib/html/sanitize";
import { parseDateInput } from "@/lib/dates";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/action-result";
import { canDeleteNote } from "./queries";

/**
 * Server actions for meeting notes. All require an admin with the "projects" module.
 * The body comes from <RichTextEditor name="body"> and is always run through cleanHtml().
 */

const MAX_BODY = 500_000;

/** Empty editor output looks like "<p><br></p>" — treat anything without text as empty. */
function htmlOrEmpty(raw: unknown) {
  const html = cleanHtml(String(raw ?? ""));
  const text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  return text ? html : "";
}

const noteSchema = z.object({
  title: z.string().trim().min(2, "Give the note a title.").max(200, "Keep the title under 200 characters."),
  date: z.string().transform((v, ctx) => {
    const d = parseDateInput(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Pick the meeting date." });
      return z.NEVER;
    }
    return d;
  }),
  attendees: z.string().trim().max(1000, "Keep attendees under 1000 characters.").optional().transform((v) => v || null),
  body: z.string().max(MAX_BODY, "That note is too long."),
  summary: z.string().trim().max(5000, "Keep the summary under 5000 characters.").optional().transform((v) => v || null),
});

function revalidateNotes(id?: string) {
  revalidatePath("/notes");
  if (id) revalidatePath(`/notes/${id}`);
}

export async function createNoteAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await actionModule("projects");
  const parsed = noteSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const body = htmlOrEmpty(parsed.data.body);
  if (!body) return { fieldErrors: { body: "Write the notes before saving." } };
  const note = await db.meetingNote.create({
    data: { ...parsed.data, body, createdById: user.id },
    select: { id: true },
  });
  await audit(user.id, "note.create", note.id);
  revalidateNotes(note.id);
  redirect(`/notes/${note.id}`);
}

export async function updateNoteAction(id: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await actionModule("projects");
  const exists = await db.meetingNote.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return { error: "Note not found." };
  const parsed = noteSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const body = htmlOrEmpty(parsed.data.body);
  if (!body) return { fieldErrors: { body: "Write the notes before saving." } };
  await db.meetingNote.update({ where: { id }, data: { ...parsed.data, body } });
  await audit(user.id, "note.update", id);
  revalidateNotes(id);
  redirect(`/notes/${id}`);
}

/** One-click delete (behind <ConfirmButton>): author or Main Admin only. */
export async function deleteNoteAction(id: string) {
  const user = await actionModule("projects");
  const note = await db.meetingNote.findUnique({ where: { id }, select: { createdById: true } });
  if (!note) return { error: "Note not found." };
  if (!canDeleteNote(user, note)) return { error: "Only the author or a Main Admin can delete this note." };
  await db.meetingNote.delete({ where: { id } });
  await audit(user.id, "note.delete", id);
  revalidateNotes();
  redirect("/notes");
}
