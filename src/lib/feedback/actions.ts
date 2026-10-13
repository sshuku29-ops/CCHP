"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionUser, actionAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES } from "@/lib/constants";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/action-result";

/** Any signed-in user can submit feedback or an idea. */
export async function submitFeedbackAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await actionUser();
  const parsed = z
    .object({
      category: z.enum(FEEDBACK_CATEGORIES),
      body: z.string().trim().min(5, "Tell us a bit more.").max(4000, "Keep it under 4000 characters."),
      // Checkboxes are only present in FormData when ticked.
      anonymous: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const anonymous = parsed.data.anonymous === "on";
  const row = await db.feedbackItem.create({
    data: {
      category: parsed.data.category,
      body: parsed.data.body,
      anonymous,
      // Anonymous submissions store no author at all.
      authorId: anonymous ? null : user.id,
    },
  });
  // Audit the fact that something was submitted, but never link an anonymous item to a person.
  await audit(anonymous ? null : user.id, "feedback.submit", anonymous ? undefined : row.id);
  revalidatePath("/feedback");
  return { ok: true, message: "Thanks — your feedback is in the inbox." };
}

/** Admins move items through NEW -> DISCUSSED -> ACTIONED -> ARCHIVED. */
export async function setFeedbackStatusAction(id: string, status: string) {
  const user = await actionAdmin();
  const s = z.enum(FEEDBACK_STATUSES).safeParse(status);
  if (!s.success) return; // unknown status: ignore silently (the UI only offers valid ones)
  await db.feedbackItem.update({ where: { id }, data: { status: s.data } });
  await audit(user.id, "feedback.status", id, { status: s.data });
  revalidatePath("/feedback");
}

/** Admins keep private notes on an item (what was decided in the meeting, etc.). */
export async function saveFeedbackNotesAction(id: string, formData: FormData) {
  const user = await actionAdmin();
  const notes = z.string().max(4000).safeParse(formData.get("adminNotes") ?? "");
  if (!notes.success) return; // too long: the textarea already caps at 4000
  await db.feedbackItem.update({ where: { id }, data: { adminNotes: notes.data.trim() || null } });
  await audit(user.id, "feedback.notes", id);
  revalidatePath("/feedback");
}

export async function deleteFeedbackAction(id: string) {
  const user = await actionAdmin();
  await db.feedbackItem.delete({ where: { id } });
  await audit(user.id, "feedback.delete", id);
  revalidatePath("/feedback");
}
