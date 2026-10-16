"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionUser, isAdmin, AuthError } from "@/lib/auth/guards";
import { HOURS_TYPES } from "@/lib/constants";
import { parseDateInput } from "@/lib/dates";
import { audit } from "@/lib/audit";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/action-result";

/**
 * Server actions for hours logging.
 *  - Anyone signed in can log their own hours and delete their own rows.
 *  - Admins can also log on behalf of another volunteer and delete any row.
 */

const logSchema = z.object({
  date: z
    .string()
    .transform((v, ctx) => {
      const d = parseDateInput(v);
      if (!d) {
        ctx.addIssue({ code: "custom", message: "Pick a date." });
        return z.NEVER;
      }
      if (d.getTime() > Date.now() + 86_400_000) {
        ctx.addIssue({ code: "custom", message: "That date is in the future." });
        return z.NEVER;
      }
      return d;
    }),
  hours: z.coerce
    .number({ message: "Enter the hours." })
    .min(0.25, "Minimum is 0.25 hours.")
    .max(24, "Maximum is 24 hours in one entry.")
    .refine((h) => Math.abs(h * 4 - Math.round(h * 4)) < 1e-9, "Use quarter-hour steps (0.25, 0.5, 0.75 …)."),
  type: z.enum(HOURS_TYPES, { message: "Choose a type." }),
  sessionRecordId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  notes: z
    .string()
    .trim()
    .max(1000, "Keep notes under 1000 characters.")
    .optional()
    .transform((v) => (v ? v : null)),
  // Admins may pick another volunteer; everyone else is forced to themselves below.
  userId: z.string().trim().optional(),
});

export async function logHours(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await actionUser();
  const parsed = logSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const { date, hours, type, sessionRecordId, notes, userId } = parsed.data;

  // Who are these hours for? Only admins may log for someone else.
  let targetId = user.id;
  if (userId && userId !== user.id) {
    if (!isAdmin(user)) return { error: "You can only log your own hours." };
    const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, isActive: true } });
    if (!target || !target.isActive) return { fieldErrors: { userId: "Pick a volunteer." } };
    targetId = target.id;
  }

  if (sessionRecordId) {
    const session = await db.sessionRecord.findUnique({ where: { id: sessionRecordId }, select: { id: true } });
    if (!session) return { fieldErrors: { sessionRecordId: "That session no longer exists." } };
  }

  const log = await db.hoursLog.create({ data: { userId: targetId, date, hours, type, sessionRecordId, notes } });
  await audit(user.id, "hours.log", log.id, { forUser: targetId, hours, type });
  revalidatePath("/hours");
  return { ok: true, message: `Logged ${hours} hour${hours === 1 ? "" : "s"}.` };
}

/** Delete one hours entry. Volunteers: own rows only. Admins: any row. */
export async function deleteHoursLog(id: string) {
  const user = await actionUser();
  const log = await db.hoursLog.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!log) return;
  if (log.userId !== user.id && !isAdmin(user)) throw new AuthError();
  await db.hoursLog.delete({ where: { id } });
  await audit(user.id, "hours.delete", id);
  revalidatePath("/hours");
}
