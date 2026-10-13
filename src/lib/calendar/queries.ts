import "server-only";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { isAdmin, canAccessModule } from "@/lib/auth/guards";
import type { CurrentUser } from "@/lib/auth/session";
import { toDateInput } from "@/lib/dates";

/**
 * One row in the shared calendar. Several database tables feed into this
 * shape so the UI only has to understand one thing.
 *
 *  - date is "YYYY-MM-DD" (the day the chip is drawn on)
 *  - time is an optional "h:mm a" label, only for timed CalendarEvents
 *  - type drives the colour: MEETING | SESSION | DEADLINE | OTHER | FOLLOW_UP
 */
export type CalendarItem = {
  id: string;
  date: string;
  time?: string;
  title: string;
  type: string;
  href: string;
  source: "event" | "session" | "task" | "waiting";
};

/** Day key for a date-only value stored at UTC midnight (tasks, sessions). */
const dayKeyUtc = (d: Date) => toDateInput(d);
/** Day key for a real timestamp (calendar events) in the server's timezone. */
const dayKeyLocal = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * Everything that should appear on the calendar between `from` (inclusive)
 * and `to` (exclusive). Both should be UTC-midnight dates.
 *
 * Visibility rules:
 *  - CalendarEvent rows and SessionRecord dates: everyone
 *  - Task due dates: admins see all tasks, volunteers only their own
 *  - WaitingOn follow-up dates: admins with the "projects" module only
 */
export async function getCalendarItems(user: CurrentUser, from: Date, to: Date): Promise<CalendarItem[]> {
  const admin = isAdmin(user);
  // Pad the event window by a day each side so timezone offsets never drop
  // an event that lands on the first/last day of the range.
  const pad = 86_400_000;
  const [events, sessions, tasks, waiting] = await Promise.all([
    db.calendarEvent.findMany({
      where: { startsAt: { gte: new Date(from.getTime() - pad), lt: new Date(to.getTime() + pad) } },
      orderBy: { startsAt: "asc" },
    }),
    db.sessionRecord.findMany({
      where: { date: { gte: from, lt: to } },
      select: { id: true, date: true, type: true, topic: true, title: true },
      orderBy: { date: "asc" },
    }),
    db.task.findMany({
      where: {
        dueDate: { gte: from, lt: to },
        status: { not: "DONE" },
        ...(admin ? {} : { assignees: { some: { userId: user.id } } }),
      },
      select: { id: true, title: true, dueDate: true },
      orderBy: { dueDate: "asc" },
    }),
    admin && canAccessModule(user, "projects")
      ? db.waitingOn.findMany({
          where: { status: "WAITING" },
          select: { id: true, contactName: true, organization: true, sentAt: true, remindAfterDays: true },
        })
      : Promise.resolve([]),
  ]);

  const items: CalendarItem[] = [];

  for (const e of events) {
    const date = dayKeyLocal(e.startsAt);
    items.push({
      id: `event:${e.id}`,
      date,
      time: format(e.startsAt, "h:mm a"),
      title: e.title,
      type: e.type,
      href: admin ? `/calendar?month=${date.slice(0, 7)}&day=${date}&edit=${e.id}` : `/calendar?month=${date.slice(0, 7)}&day=${date}`,
      source: "event",
    });
  }

  const canOpenSessions = admin && canAccessModule(user, "records");
  for (const s of sessions) {
    const date = dayKeyUtc(s.date);
    const label = s.title ?? s.topic ?? (s.type === "FORMAL" ? "Formal session" : "Informal session");
    items.push({
      id: `session:${s.id}`,
      date,
      title: `${s.type === "FORMAL" ? "Formal" : "Informal"} session: ${label}`,
      type: "SESSION",
      href: canOpenSessions ? `/sessions/${s.id}` : `/calendar?month=${date.slice(0, 7)}&day=${date}`,
      source: "session",
    });
  }

  for (const t of tasks) {
    if (!t.dueDate) continue;
    items.push({
      id: `task:${t.id}`,
      date: dayKeyUtc(t.dueDate),
      title: `Due: ${t.title}`,
      type: "DEADLINE",
      href: `/tasks/${t.id}`,
      source: "task",
    });
  }

  for (const w of waiting) {
    const followUp = new Date(w.sentAt.getTime() + w.remindAfterDays * 86_400_000);
    if (followUp < from || followUp >= to) continue;
    items.push({
      id: `waiting:${w.id}`,
      date: dayKeyUtc(followUp),
      title: `Follow up: ${w.contactName}${w.organization ? ` (${w.organization})` : ""}`,
      type: "FOLLOW_UP",
      href: `/waiting-on?focus=${w.id}`,
      source: "waiting",
    });
  }

  // Sort by day, then timed events in time order, then everything else by title.
  items.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "") || a.title.localeCompare(b.title));
  return items;
}

export async function getCalendarEvent(id: string) {
  return db.calendarEvent.findUnique({ where: { id } });
}
