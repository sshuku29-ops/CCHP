import "server-only";
import { db } from "@/lib/db";
import { isMainAdmin } from "@/lib/auth/guards";
import type { CurrentUser } from "@/lib/auth/session";

const personSelect = { id: true, firstName: true, lastName: true, photoKey: true } as const;

/**
 * Meeting notes list, newest meeting first.
 * `q` searches title, body (HTML), attendees and summary; `year` filters by meeting date.
 */
export async function listMeetingNotes(opts: { q?: string; year?: number | null }) {
  const q = opts.q?.trim();
  const year = opts.year ?? null;
  return db.meetingNote.findMany({
    where: {
      ...(year ? { date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { body: { contains: q, mode: "insensitive" } },
              { attendees: { contains: q, mode: "insensitive" } },
              { summary: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      date: true,
      attendees: true,
      summary: true,
      source: true,
      createdAt: true,
      createdBy: { select: personSelect },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

/** Distinct meeting years, newest first (for the year filter). */
export async function listNoteYears(): Promise<number[]> {
  const rows = await db.meetingNote.findMany({ select: { date: true } });
  const years = new Set(rows.map((r) => r.date.getUTCFullYear()));
  return [...years].sort((a, b) => b - a);
}

export async function getMeetingNote(id: string) {
  return db.meetingNote.findUnique({
    where: { id },
    include: { createdBy: { select: personSelect } },
  });
}

/** Only the author or a Main Admin may delete a note. (Any projects admin may edit.) */
export function canDeleteNote(user: Pick<CurrentUser, "id" | "role">, note: { createdById: string | null }) {
  return isMainAdmin(user) || (note.createdById !== null && note.createdById === user.id);
}
