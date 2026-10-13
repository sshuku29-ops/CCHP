import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { isMainAdmin } from "@/lib/auth/guards";
import { termForDate } from "@/lib/dates";

/**
 * Read-side helpers for volunteer certificates.
 * Admins with the "volunteers" module can see the certificates page; only the
 * Main Admin or the Executive Director may issue (see canIssueCertificates).
 * No ranking anywhere: volunteer tables are sorted by name, never by hours.
 */

const TERM_RE = /^(Fall|Spring|Summer) (\d{4})$/;

export function isTermLabel(v: unknown): v is string {
  return typeof v === "string" && TERM_RE.test(v);
}

/** Who may issue certificates: the Main Admin or the Executive Director. */
export function canIssueCertificates(user: Pick<CurrentUser, "role" | "leadershipTitle">) {
  return isMainAdmin(user) || user.leadershipTitle === "Executive Director";
}

/**
 * First/last calendar day of a term as UTC midnight (how date-only values are stored).
 * Mirrors termForDate(): Fall = Aug–Dec, Spring = Jan–May, Summer = Jun–Jul.
 */
export function termDateRange(term: string): { start: Date; end: Date } {
  const m = TERM_RE.exec(term);
  if (!m) throw new Error(`Bad term label: ${term}`);
  const y = Number(m[2]);
  if (m[1] === "Fall") return { start: new Date(Date.UTC(y, 7, 1)), end: new Date(Date.UTC(y, 11, 31)) };
  if (m[1] === "Spring") return { start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y, 4, 31)) };
  return { start: new Date(Date.UTC(y, 5, 1)), end: new Date(Date.UTC(y, 6, 31)) };
}

/** Academic year for a term (Fall 2026, Spring 2027 and Summer 2027 are all 2026). */
export function academicYearForTerm(term: string): number {
  const m = TERM_RE.exec(term);
  if (!m) return new Date().getFullYear();
  return m[1] === "Fall" ? Number(m[2]) : Number(m[2]) - 1;
}

/** Hours dates are UTC midnight; rebuild from UTC fields before asking which term they fall in. */
function termOfHoursDate(d: Date) {
  return termForDate(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Terms with any logged hours or any session, newest first, plus the current term. */
export async function listCertificateTerms(): Promise<string[]> {
  const [logs, sessions] = await Promise.all([
    db.hoursLog.findMany({ select: { date: true }, distinct: ["date"] }),
    db.sessionRecord.findMany({ select: { term: true }, distinct: ["term"] }),
  ]);
  const set = new Set<string>([termForDate(new Date()), ...sessions.map((s) => s.term), ...logs.map((l) => termOfHoursDate(l.date))]);
  // Newest first: sort by (academic year, season order).
  const order: Record<string, number> = { Fall: 0, Spring: 1, Summer: 2 };
  return [...set].sort((a, b) => {
    const ya = academicYearForTerm(a);
    const yb = academicYearForTerm(b);
    if (ya !== yb) return yb - ya;
    return order[b.split(" ")[0]] - order[a.split(" ")[0]];
  });
}

export type TermVolunteerRow = {
  userId: string;
  firstName: string;
  lastName: string;
  photoKey: string | null;
  hours: number;
  sessionsCount: number;
  certificate: {
    id: string;
    hours: number;
    sessionsCount: number;
    manual: boolean;
    issuedAt: Date;
    document: { fileKey: string; fileName: string } | null;
  } | null;
};

/** Hours + sessions for one user in a term (what a generated certificate states). */
export async function summarizeUserTerm(userId: string, term: string): Promise<{ hours: number; sessionsCount: number }> {
  const { start, end } = termDateRange(term);
  const [logs, participation] = await Promise.all([
    db.hoursLog.findMany({ where: { userId, date: { gte: start, lte: end } }, select: { hours: true, sessionRecordId: true } }),
    db.sessionVolunteer.findMany({ where: { userId, session: { term } }, select: { sessionId: true } }),
  ]);
  const hours = Math.round(logs.reduce((s, l) => s + l.hours, 0) * 100) / 100;
  const sessionIds = new Set<string>(participation.map((p) => p.sessionId));
  for (const l of logs) if (l.sessionRecordId) sessionIds.add(l.sessionRecordId);
  return { hours, sessionsCount: sessionIds.size };
}

/**
 * Every volunteer with hours in the term (plus anyone who already holds a
 * certificate for it), sorted by name. Never sorted by hours.
 */
export async function listTermVolunteers(term: string): Promise<TermVolunteerRow[]> {
  const { start, end } = termDateRange(term);
  const [logs, participation, certs] = await Promise.all([
    db.hoursLog.findMany({
      where: { date: { gte: start, lte: end } },
      select: { userId: true, hours: true, sessionRecordId: true },
    }),
    db.sessionVolunteer.findMany({ where: { session: { term } }, select: { userId: true, sessionId: true } }),
    db.certificate.findMany({
      where: { term },
      select: {
        id: true,
        userId: true,
        hours: true,
        sessionsCount: true,
        manual: true,
        issuedAt: true,
        document: { select: { fileKey: true, fileName: true } },
      },
    }),
  ]);

  const hoursBy = new Map<string, number>();
  const sessionsBy = new Map<string, Set<string>>();
  const addSession = (userId: string, sessionId: string) => {
    if (!sessionsBy.has(userId)) sessionsBy.set(userId, new Set());
    sessionsBy.get(userId)!.add(sessionId);
  };
  for (const l of logs) {
    hoursBy.set(l.userId, (hoursBy.get(l.userId) ?? 0) + l.hours);
    if (l.sessionRecordId) addSession(l.userId, l.sessionRecordId);
  }
  for (const p of participation) addSession(p.userId, p.sessionId);
  const certBy = new Map(certs.map((c) => [c.userId, c]));

  const ids = new Set<string>([...hoursBy.keys(), ...certBy.keys()]);
  if (ids.size === 0) return [];
  const users = await db.user.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, firstName: true, lastName: true, photoKey: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return users.map((u) => {
    const c = certBy.get(u.id);
    return {
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      photoKey: u.photoKey,
      hours: Math.round((hoursBy.get(u.id) ?? 0) * 100) / 100,
      sessionsCount: sessionsBy.get(u.id)?.size ?? 0,
      certificate: c
        ? { id: c.id, hours: c.hours, sessionsCount: c.sessionsCount, manual: c.manual, issuedAt: c.issuedAt, document: c.document }
        : null,
    };
  });
}

/** The signed-in person's own certificates, newest first. Safe for volunteers (filtered by id). */
export async function listMyCertificates(userId: string) {
  return db.certificate.findMany({
    where: { userId },
    select: {
      id: true,
      term: true,
      hours: true,
      sessionsCount: true,
      issuedAt: true,
      document: { select: { fileKey: true, fileName: true } },
      issuedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { issuedAt: "desc" },
  });
}

/** Active people for the manual-certificate picker (names only). */
export async function listUsersForCertificates() {
  return db.user.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

/** Rows for the CSV export, optionally limited to one term. Sorted by name. */
export async function certificatesForExport(term?: string) {
  const rows = await db.certificate.findMany({
    where: term ? { term } : {},
    select: {
      id: true,
      term: true,
      year: true,
      hours: true,
      sessionsCount: true,
      manual: true,
      notes: true,
      issuedAt: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      issuedBy: { select: { firstName: true, lastName: true } },
      document: { select: { fileName: true, fileKey: true } },
    },
    orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }, { issuedAt: "desc" }],
  });
  return rows.map((c) => ({
    id: c.id,
    lastName: c.user.lastName,
    firstName: c.user.firstName,
    email: c.user.email ?? "",
    term: c.term,
    academicYear: c.year,
    hours: c.hours,
    sessions: c.sessionsCount,
    manual: c.manual ? "yes" : "no",
    issuedAt: c.issuedAt,
    issuedBy: c.issuedBy ? `${c.issuedBy.firstName} ${c.issuedBy.lastName}` : "",
    file: c.document ? `/api/files/${c.document.fileKey}` : "",
    notes: c.notes ?? "",
  }));
}
