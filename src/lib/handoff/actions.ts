"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionModule, actionMainAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/action-result";
import { cleanHtml } from "@/lib/html/sanitize";
import { canEditHandoff } from "./queries";

const MAX_CONTENT = 500_000; // ~500 KB of HTML is plenty for one role

/** Save the body (HTML from the rich text editor, sanitized). Allowed for the owner or a Main Admin. */
export async function saveHandoffContentAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await actionModule("handoff");
  const doc = await db.handoffDoc.findUnique({ where: { id }, select: { ownerId: true } });
  if (!doc) return { error: "Document not found." };
  if (!canEditHandoff(user, doc)) return { error: "Only this role's owner or a Main Admin can edit it." };
  const parsed = z.string().max(MAX_CONTENT, "That document is too long.").safeParse(formData.get("content") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid content." };
  const content = cleanHtml(parsed.data);
  await db.handoffDoc.update({ where: { id }, data: { content, updatedById: user.id } });
  await audit(user.id, "handoff.update", id);
  revalidatePath("/handoff");
  revalidatePath(`/handoff/${id}`);
  return { ok: true, message: "Saved." };
}

/** Main Admin: assign (or clear) the owner of a doc. */
export async function setHandoffOwnerAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const actor = await actionMainAdmin();
  const ownerId = String(formData.get("ownerId") ?? "");
  if (ownerId) {
    const owner = await db.user.findFirst({ where: { id: ownerId, role: { in: ["ADMIN", "MAIN_ADMIN"] } }, select: { id: true } });
    if (!owner) return { error: "Owner must be an admin account." };
  }
  await db.handoffDoc.update({ where: { id }, data: { ownerId: ownerId || null } });
  await audit(actor.id, "handoff.owner", id, { ownerId: ownerId || null });
  revalidatePath("/handoff");
  revalidatePath(`/handoff/${id}`);
  return { ok: true, message: "Owner updated." };
}

/** Starting content for a new doc (HTML, matching what the rich text editor produces). */
const TEMPLATE = (roleTitle: string) =>
  [
    `<h1>${roleTitle.replace(/[<>&]/g, "")} — handoff notes</h1>`,
    "<h2>What this role owns</h2><p><em>(fill in)</em></p>",
    "<h2>Recurring tasks</h2><ul><li>&nbsp;</li></ul>",
    "<h2>Key contacts</h2><ul><li>&nbsp;</li></ul>",
    "<h2>Email templates</h2><p><em>(paste templates here)</em></p>",
    "<h2>Advice for your successor</h2><p><br></p>",
  ].join("");

/** Main Admin: create a doc for a new role title. Redirects to the new doc. */
export async function createHandoffDocAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const actor = await actionMainAdmin();
  const parsed = z
    .object({
      roleTitle: z.string().trim().min(3, "Give the role a title.").max(80),
      ownerId: z.string().trim().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const { roleTitle, ownerId } = parsed.data;
  const exists = await db.handoffDoc.findUnique({ where: { roleTitle }, select: { id: true } });
  if (exists) return { fieldErrors: { roleTitle: "A doc for that role already exists." } };
  const doc = await db.handoffDoc.create({
    data: { roleTitle, ownerId: ownerId || null, content: TEMPLATE(roleTitle), updatedById: actor.id },
    select: { id: true },
  });
  await audit(actor.id, "handoff.create", doc.id, { roleTitle });
  revalidatePath("/handoff");
  redirect(`/handoff/${doc.id}`);
}
