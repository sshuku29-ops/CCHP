import "server-only";
import { db } from "@/lib/db";
import { HOURS_TYPES, HOURS_TYPE_LABELS } from "@/lib/constants";
import { termForDate, academicYearForDate } from "@/lib/dates";

/**
 * Read-side helpers for volunteer hours logging.
 * Volunteers only ever see their own rows (filter by userId here).
 * Admin views show every volunteer but never rank people (collective totals only).
 */

/**
 * Hours dates are stored at UTC midnight. termForDate()/academicYearForDate()
 * use local getMonth(), which can slip a day in US timezones, so first rebuild
 * the date from its UTC calendar fields.
 */
export function calendarDate(d: Date) {
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
export function termOf(d: Date) {
  return termForDate(calendarDate(d));
}
export function academicYearOf(d: Date) {
  return academicYearForDate(calendarDate(d));
}
/** "2026-03" style key used to group by month. */
export function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const sessionSelect = { id: true, title: true, topic: true, date: true, type: true } as const;

// ───────────────────────── My hours ────────────────────────────

export async function listMyHours(userId: string) {
  return db.hoursLog.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { sessionRecord: { select: sessionSelect } },
  });
}

export type HoursRow = { date: Date; hours: number; type: string };

/** Running totals for one person (or any set of rows). */
export function summarizeHours(rows: HoursRow[], now = new Date()) {
  const thisTerm = termForDate(now);
  const thisYear = academicYearForDate(now);
  const sum = (list: HoursRow[]) => Math.round(list.reduce((t, r) => t + r.hours, 0) * 100) / 100;
  const byType = HOURS_TYPES.map((type) => ({
    type,
    label: HOURS_TYPE_LABELS[type],
    hours: sum(rows.filter((r) => r.type === type)),
  }));
  return {
    thisTerm,
    thisYear,
    term: sum(rows.filter((r) => termOf(r.date) === thisTerm)),
    year: sum(rows.filter((r) => academicYearOf(r.date) === thisYear)),
    allTime: sum(rows),
    byType,
  };
}

/** Sessions a volunteer can attach hours to: anything in the last 90 days (plus today). */
export async function listRecentSessions() {
  const since = new Date(Date.now() - 90 * 86_400_000);
  const until = new Date(Date.now() + 86_400_000);
  return db.sessionRecord.findMany({
    where: { date: { gte: since, lte: until } },
    orderBy: { date: "desc" },
    select: sessionSelect,
  });
}

// ───────────────────────── Admin: all volunteers ───────────────

export type HoursFilters = {
  term?: string;
  year?: number;
  type?: string;
  userId?: string;
};

/** Parse the ?term=&year=&type=&user= search params shared by the page and the CSV export. */
export function hoursFiltersFromSearchParams(sp: Record<string, string | string[] | undefined>): HoursFilters {
  const str = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const year = str("year");
  const type = str("type");
  return {
    term: str("term"),
    year: year && /^\d{4}$/.test(year) ? Number(year) : undefined,
    type: type && (HOURS_TYPES as readonly string[]).includes(type) ? type : undefined,
    userId: str("user"),
  };
}

export async function listAllHours(filters: HoursFilters) {
  const rows = await db.hoursLog.findMany({
    where: {
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      sessionRecord: { select: sessionSelect },
    },
  });
  // Term / academic year are derived from the date, so filter in JS (the table is small).
  return rows.filter(
    (r) => (!filters.term || termOf(r.date) === filters.term) && (filters.year === undefined || academicYearOf(r.date) === filters.year),
  );
}

export type AllHoursRow = Awaited<ReturnType<typeof listAllHours>>[number];

/** Collective totals for the admin view: by type and by month. Never per person. */
export function collectiveTotals(rows: HoursRow[]) {
  const total = Math.round(rows.reduce((t, r) => t + r.hours, 0) * 100) / 100;
  const byType = HOURS_TYPES.map((type) => ({
    type,
    label: HOURS_TYPE_LABELS[type],
    hours: Math.round(rows.filter((r) => r.type === type).reduce((t, r) => t + r.hours, 0) * 100) / 100,
  }));
  const months = new Map<string, number>();
  for (const r of rows) months.set(monthKey(r.date), (months.get(monthKey(r.date)) ?? 0) + r.hours);
  const byMonth = [...months.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, hours]) => ({ key, hours: Math.round(hours * 100) / 100 }));
  return { total, entries: rows.length, byType, byMonth };
}

/** Options for the admin filter selects. Terms/years come from the data that exists. */
export async function hoursFilterOptions() {
  const [dates, users] = await Promise.all([
    db.hoursLog.findMany({ select: { date: true }, distinct: ["date"] }),
    db.user.findMany({
      where: { isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);
  const terms = [...new Set(dates.map((d) => termOf(d.date)))];
  const years = [...new Set(dates.map((d) => academicYearOf(d.date)))].sort((a, b) => b - a);
  // Sort terms newest first: by year, then Fall > Summer > Spring.
  const rank: Record<string, number> = { Spring: 1, Summer: 2, Fall: 3 };
  terms.sort((a, b) => {
    const [sa, ya] = a.split(" ");
    const [sb, yb] = b.split(" ");
    return Number(yb) - Number(ya) || rank[sb] - rank[sa];
  });
  return { terms, years, users };
}

/** Active users an admin can log hours for. */
export async function listUsersForHours() {
  return db.user.findMany({
    where: { isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });
}
