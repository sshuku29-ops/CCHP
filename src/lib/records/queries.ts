import "server-only";
import { db } from "@/lib/db";
import { termForDate } from "@/lib/dates";

/**
 * Read-side helpers for the Data & records module (volunteer directory +
 * session records). Everything here is admin-only data: callers must guard
 * with requireModule()/actionModule() BEFORE calling these.
 *
 * Volunteer directory rule (spec §3): we only ever expose these fields —
 * first/last name, email, phone, graduation date, has-vehicle, role,
 * sessions participated, hours logged, public opt-in. Nothing else.
 */

// ───────────────────────── Volunteer directory ─────────────────────────

export type VolunteerFilters = {
  role?: string; // MAIN_ADMIN | ADMIN | VOLUNTEER
  active?: "active" | "inactive" | "all";
  term?: string; // e.g. "Fall 2025" — only people who volunteered at a session that term
  q?: string; // name search
};

export type VolunteerRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  graduationDate: Date | null;
  hasVehicle: boolean;
  role: string;
  isActive: boolean;
  publicHoursOptIn: boolean;
  sessionsCount: number;
  hoursThisTerm: number;
  hoursAllTime: number;
};

/** Dates are stored at UTC midnight; shift so term/month maths use the calendar day. */
function calendarDay(d: Date) {
  return new Date(d.getTime() + d.getTimezoneOffset() * 60_000);
}

export function currentTermLabel() {
  return termForDate(new Date());
}

export async function listVolunteers(filters: VolunteerFilters = {}): Promise<VolunteerRow[]> {
  const active = filters.active ?? "active";
  const q = filters.q?.trim();
  const users = await db.user.findMany({
    where: {
      ...(filters.role ? { role: filters.role } : {}),
      ...(active === "active" ? { isActive: true } : active === "inactive" ? { isActive: false } : {}),
      ...(filters.term ? { sessionParticipation: { some: { session: { term: filters.term } } } } : {}),
      ...(q
        ? {
            OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }],
          }
        : {}),
    },
    // Only the allowed directory fields (spec §3) plus what we need to aggregate.
    select: {
      id: true,
      firstName: true,
      lastName: true,
      photoKey: true,
      email: true,
      phone: true,
      graduationDate: true,
      hasVehicle: true,
      role: true,
      isActive: true,
      publicHoursOptIn: true,
      _count: { select: { sessionParticipation: true } },
      hoursLogs: { select: { hours: true, date: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const thisTerm = currentTermLabel();
  return users.map((u) => {
    let hoursThisTerm = 0;
    let hoursAllTime = 0;
    for (const h of u.hoursLogs) {
      hoursAllTime += h.hours;
      if (termForDate(calendarDay(h.date)) === thisTerm) hoursThisTerm += h.hours;
    }
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      graduationDate: u.graduationDate,
      hasVehicle: u.hasVehicle,
      role: u.role,
      isActive: u.isActive,
      publicHoursOptIn: u.publicHoursOptIn,
      sessionsCount: u._count.sessionParticipation,
      hoursThisTerm: round1(hoursThisTerm),
      hoursAllTime: round1(hoursAllTime),
    };
  });
}

/** One volunteer with their session list and hours log, for /volunteers/[id]. */
export async function getVolunteer(id: string) {
  const u = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      photoKey: true,
      email: true,
      phone: true,
      graduationDate: true,
      hasVehicle: true,
      role: true,
      isActive: true,
      publicHoursOptIn: true,
      sessionParticipation: {
        select: {
          role: true,
          session: { select: { id: true, date: true, type: true, topic: true, title: true, term: true } },
        },
        orderBy: { session: { date: "desc" } },
      },
      hoursLogs: {
        select: { id: true, date: true, hours: true, type: true, notes: true, sessionRecordId: true },
        orderBy: { date: "desc" },
      },
    },
  });
  if (!u) return null;
  const thisTerm = currentTermLabel();
  const hoursAllTime = round1(u.hoursLogs.reduce((s, h) => s + h.hours, 0));
  const hoursThisTerm = round1(
    u.hoursLogs.filter((h) => termForDate(calendarDay(h.date)) === thisTerm).reduce((s, h) => s + h.hours, 0),
  );
  return { ...u, hoursAllTime, hoursThisTerm, thisTerm };
}

/** Distinct term labels that have at least one session, newest first. */
export async function listSessionTerms(): Promise<string[]> {
  const rows = await db.sessionRecord.findMany({
    distinct: ["term"],
    select: { term: true, date: true },
    orderBy: { date: "desc" },
  });
  return Array.from(new Set(rows.map((r) => r.term)));
}

/** Distinct academic years that have sessions, newest first. */
export async function listSessionYears(): Promise<number[]> {
  const rows = await db.sessionRecord.findMany({ distinct: ["year"], select: { year: true }, orderBy: { year: "desc" } });
  return rows.map((r) => r.year);
}

// ───────────────────────── Session records ─────────────────────────

export type SessionFilters = {
  year?: number;
  term?: string;
  type?: string; // FORMAL | INFORMAL
};

export async function listSessions(filters: SessionFilters = {}) {
  return db.sessionRecord.findMany({
    where: {
      ...(filters.year ? { year: filters.year } : {}),
      ...(filters.term ? { term: filters.term } : {}),
      ...(filters.type ? { type: filters.type } : {}),
    },
    include: {
      _count: { select: { volunteers: true, materials: true, documents: true } },
    },
    orderBy: { date: "desc" },
  });
}

export async function getSession(id: string) {
  return db.sessionRecord.findUnique({
    where: { id },
    include: {
      materials: true,
      // Uploaded files (brochure PDFs, slides, volunteer photos). Grouped by category on the page.
      documents: {
        select: { id: true, title: true, kind: true, category: true, fileKey: true, fileName: true, isPublic: true, size: true, createdAt: true },
        orderBy: [{ category: "asc" }, { createdAt: "asc" }],
      },
      volunteers: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { user: { lastName: "asc" } },
      },
    },
  });
}

/** Active users for the "volunteers involved" checkbox list. Names only. */
export async function listUsersForPicker() {
  return db.user.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
