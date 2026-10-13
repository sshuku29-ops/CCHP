"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionModule } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { parseDateInput } from "@/lib/dates";
import { WAITING_CHANNELS } from "@/lib/constants";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/action-result";

/**
 * Server actions for the "Waiting on" tracker. Every action re-checks that the
 * caller is an admin with access to the "projects" module.
 */

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const waitingOnSchema = z.object({
  contactName: z.string().trim().min(1, "Who did you contact?").max(120),
  organization: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  whatSent: z.string().trim().min(1, "Describe what you sent.").max(500),
  channel: z.preprocess(emptyToUndefined, z.enum(WAITING_CHANNELS).optional()),
  sentAt: z.string().refine((v) => parseDateInput(v) !== null, "Enter the date it was sent."),
  remindAfterDays: z.coerce.number().int().min(1, "At least 1 day.").max(365, "At most 365 days."),
  ownerId: z.preprocess(emptyToUndefined, z.string().optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

/** Turns the raw form data into a validated Prisma-ready object (or field errors). */
async function parseForm(formData: FormData) {
  const parsed = waitingOnSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) } as const;
  const d = parsed.data;
  // The owner must be an active admin; ignore anything else from the client.
  let ownerId: string | null = null;
  if (d.ownerId) {
    const owner = await db.user.findFirst({
      where: { id: d.ownerId, role: { in: ["ADMIN", "MAIN_ADMIN"] }, isActive: true },
      select: { id: true },
    });
    if (!owner) return { fieldErrors: { ownerId: "Pick a valid owner." } } as const;
    ownerId = owner.id;
  }
  return {
    data: {
      contactName: d.contactName,
      organization: d.organization ?? null,
      whatSent: d.whatSent,
      channel: d.channel ?? null,
      sentAt: parseDateInput(d.sentAt)!,
      remindAfterDays: d.remindAfterDays,
      ownerId,
      notes: d.notes ?? null,
    },
  } as const;
}

export async function createWaitingOnAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await actionModule("projects");
  const result = await parseForm(formData);
  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };
  const row = await db.waitingOn.create({ data: result.data });
  await audit(user.id, "waitingOn.create", row.id);
  revalidatePath("/waiting-on");
  redirect("/waiting-on");
}

export async function updateWaitingOnAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await actionModule("projects");
  const result = await parseForm(formData);
  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };
  const existing = await db.waitingOn.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { error: "This item no longer exists." };
  await db.waitingOn.update({ where: { id }, data: result.data });
  await audit(user.id, "waitingOn.update", id);
  revalidatePath("/waiting-on");
  redirect("/waiting-on");
}

/** Marks the item as replied today. */
export async function markRepliedAction(id: string) {
  const user = await actionModule("projects");
  await db.waitingOn.update({ where: { id }, data: { status: "REPLIED", repliedAt: new Date() } });
  await audit(user.id, "waitingOn.replied", id);
  revalidatePath("/waiting-on");
  revalidatePath("/calendar");
}

export async function closeWaitingOnAction(id: string) {
  const user = await actionModule("projects");
  await db.waitingOn.update({ where: { id }, data: { status: "CLOSED" } });
  await audit(user.id, "waitingOn.close", id);
  revalidatePath("/waiting-on");
  revalidatePath("/calendar");
}

/** Puts a replied/closed item back into WAITING (and clears repliedAt). */
export async function reopenWaitingOnAction(id: string) {
  const user = await actionModule("projects");
  await db.waitingOn.update({ where: { id }, data: { status: "WAITING", repliedAt: null } });
  await audit(user.id, "waitingOn.reopen", id);
  revalidatePath("/waiting-on");
  revalidatePath("/calendar");
}

export async function deleteWaitingOnAction(id: string) {
  const user = await actionModule("projects");
  await db.waitingOn.delete({ where: { id } });
  await audit(user.id, "waitingOn.delete", id);
  revalidatePath("/waiting-on");
  revalidatePath("/calendar");
}
