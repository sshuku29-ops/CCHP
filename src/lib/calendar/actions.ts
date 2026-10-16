"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { EVENT_TYPES } from "@/lib/constants";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/action-result";

/**
 * Admin-only server actions for CalendarEvent rows.
 *
 * Date/time handling: the form sends a date ("YYYY-MM-DD") and an optional
 * time ("HH:mm"). We combine them and parse in the server's timezone, and we
 * also format them in the server's timezone when displaying, so what you type
 * is what you see. (On Vercel the server runs in UTC; that is fine as long as
 * both directions agree.)
 */

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const timeRe = /^\d{2}:\d{2}$/;

const eventSchema = z.object({
  title: z.string().trim().min(1, "Give the event a title.").max(150),
  type: z.enum(EVENT_TYPES),
  startDate: z.string().regex(dateRe, "Enter a start date."),
  startTime: z.preprocess(emptyToUndefined, z.string().regex(timeRe, "Enter a valid time.").optional()),
  endDate: z.preprocess(emptyToUndefined, z.string().regex(dateRe, "Enter a valid end date.").optional()),
  endTime: z.preprocess(emptyToUndefined, z.string().regex(timeRe, "Enter a valid time.").optional()),
  location: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

function combine(date: string, time?: string) {
  const d = new Date(`${date}T${time ?? "00:00"}:00`);
  return isNaN(d.getTime()) ? null : d;
}

function parseForm(formData: FormData) {
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) } as const;
  const d = parsed.data;
  const startsAt = combine(d.startDate, d.startTime);
  if (!startsAt) return { fieldErrors: { startDate: "Enter a valid start date." } } as const;
  let endsAt: Date | null = null;
  if (d.endDate || d.endTime) {
    endsAt = combine(d.endDate ?? d.startDate, d.endTime);
    if (!endsAt) return { fieldErrors: { endDate: "Enter a valid end date." } } as const;
    if (endsAt < startsAt) return { fieldErrors: { endDate: "End must be after start." } } as const;
  }
  return {
    data: {
      title: d.title,
      type: d.type,
      startsAt,
      endsAt,
      location: d.location ?? null,
      description: d.description ?? null,
    },
  } as const;
}

/** After saving, go back to the month the event lives in. */
function monthHref(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `/calendar?month=${y}-${m}`;
}

export async function createEventAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await actionAdmin();
  const result = parseForm(formData);
  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };
  const row = await db.calendarEvent.create({ data: { ...result.data, createdById: user.id } });
  await audit(user.id, "calendarEvent.create", row.id);
  revalidatePath("/calendar");
  redirect(monthHref(row.startsAt));
}

export async function updateEventAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await actionAdmin();
  const result = parseForm(formData);
  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };
  const existing = await db.calendarEvent.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { error: "This event no longer exists." };
  const row = await db.calendarEvent.update({ where: { id }, data: result.data });
  await audit(user.id, "calendarEvent.update", id);
  revalidatePath("/calendar");
  redirect(monthHref(row.startsAt));
}

export async function deleteEventAction(id: string) {
  const user = await actionAdmin();
  await db.calendarEvent.delete({ where: { id } });
  await audit(user.id, "calendarEvent.delete", id);
  revalidatePath("/calendar");
}
