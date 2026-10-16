"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionModule, AuthError } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { academicYearForDate, parseDateInput, termForDate } from "@/lib/dates";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/action-result";

/**
 * Informal session quick-log (/sessions/informal/new).
 * One form saves three things at once:
 *  1. a SessionRecord of type INFORMAL (title, activities, counts, notes),
 *  2. a SessionVolunteer row for every selected volunteer,
 *  3. an HoursLog (type INFORMAL_SESSION) for each of those volunteers.
 * Volunteers without an account are only counted (volunteerCount), never named.
 */

const schema = z.object({
  date: z.string().transform((v, ctx) => {
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
  title: z.string().trim().min(2, "Give the session a short title.").max(200),
  activities: z.string().trim().max(5000, "Keep this under 5000 characters.").optional().transform((v) => (v ? v : null)),
  // People who helped but don't have a platform account — a count only.
  volunteerCount: z.coerce.number().int("Whole numbers only.").min(0, "Cannot be negative.").max(500).default(0),
  participantCount: z.coerce.number().int("Whole numbers only.").min(0, "Cannot be negative.").max(10_000).default(0),
  hours: z.coerce
    .number({ message: "Enter the hours." })
    .min(0.25, "Minimum is 0.25 hours.")
    .max(24, "Maximum is 24 hours.")
    .refine((h) => Math.abs(h * 4 - Math.round(h * 4)) < 1e-9, "Use quarter-hour steps (0.25, 0.5, 0.75 …)."),
  location: z.string().trim().max(200).optional().transform((v) => (v ? v : null)),
  notes: z.string().trim().max(5000, "Keep notes under 5000 characters.").optional().transform((v) => (v ? v : null)),
});

export async function logInformalSession(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let admin;
  try {
    admin = await actionModule("records");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const d = parsed.data;

  // Only keep volunteer ids that are real, active users (never trust the client).
  const requested = Array.from(new Set(fd.getAll("volunteerIds").map(String).filter(Boolean)));
  const volunteers = requested.length
    ? await db.user.findMany({ where: { id: { in: requested }, isActive: true }, select: { id: true } })
    : [];
  if (volunteers.length === 0 && d.volunteerCount === 0) {
    return { fieldErrors: { volunteerIds: "Pick at least one volunteer, or enter how many others were there." } };
  }

  // Term/year use the calendar day (dates are stored at UTC midnight).
  const local = new Date(d.date.getTime() + d.date.getTimezoneOffset() * 60_000);
  const session = await db.sessionRecord.create({
    data: {
      date: d.date,
      type: "INFORMAL",
      title: d.title,
      topic: d.title,
      activities: d.activities,
      volunteerCount: d.volunteerCount,
      participantCount: d.participantCount,
      location: d.location,
      notes: d.notes,
      term: termForDate(local),
      year: academicYearForDate(local),
      volunteers: { create: volunteers.map((v) => ({ userId: v.id, role: "support" })) },
      hoursLogs: {
        create: volunteers.map((v) => ({
          userId: v.id,
          date: d.date,
          hours: d.hours,
          type: "INFORMAL_SESSION",
          notes: `Informal session: ${d.title}`,
        })),
      },
    },
    select: { id: true },
  });

  await audit(admin.id, "session.informal.create", session.id, { volunteers: volunteers.length, others: d.volunteerCount, hours: d.hours });
  for (const p of ["/sessions", "/sessions/roster", "/hours", "/dashboard"]) revalidatePath(p);
  redirect(`/sessions/${session.id}`);
}
