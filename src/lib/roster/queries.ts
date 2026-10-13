import "server-only";
import { db } from "@/lib/db";
import { termForDate } from "@/lib/dates";

/**
 * Read-side helpers for session rostering (which volunteers run which session).
 * The roster page is admin-only (module "records"); the "my upcoming sessions"
 * helpers are safe for volunteers because they filter by the user's own id.
 */

import { type AssignableUser, type SessionRole } from "./roles";

// Re-exported so server code can import everything roster-related from one place.
export { SESSION_ROLES, SESSION_ROLE_LABELS, MIN_PRESENTERS, type SessionRole, type AssignableUser } from "./roles";

/** Today at UTC midnight — session dates are stored at UTC midnight too. */
export function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** Term labels to offer in the picker: every term that has a session, plus the current one. */
export async function listRosterTerms(): Promise<string[]> {
  const rows = await db.sessionRecord.findMany({ distinct: ["term"], select: { term: true, date: true }, orderBy: { date: "desc" } });
  const terms = Array.from(new Set(rows.map((r) => r.term)));
  const current = termForDate(new Date());
  if (!terms.includes(current)) terms.unshift(current);
  return terms;
}

/** Sessions in a term with their assigned volunteers. Upcoming first (soonest), then past (most recent). */
export async function listRosterForTerm(term: string) {
  const sessions = await db.sessionRecord.findMany({
    where: { term },
    select: {
      id: true,
      date: true,
      type: true,
      title: true,
      topic: true,
      location: true,
      volunteers: {
        select: { role: true, user: { select: { id: true, firstName: true, lastName: true, photoKey: true, role: true } } },
        orderBy: { user: { lastName: "asc" } },
      },
    },
    orderBy: { date: "asc" },
  });
  const today = todayUtc().getTime();
  const upcoming = sessions.filter((s) => s.date.getTime() >= today);
  const past = sessions.filter((s) => s.date.getTime() < today).reverse();
  return [...upcoming, ...past].map((s) => ({
    ...s,
    isUpcoming: s.date.getTime() >= today,
    // No role saved = presenter (the default).
    presenterCount: s.volunteers.filter((v) => (v.role ?? "presenter") === "presenter").length,
  }));
}

export type RosterSession = Awaited<ReturnType<typeof listRosterForTerm>>[number];

/** Active people who can be put on a roster (volunteers and leaders), with how many sessions they already have this term. */
export async function listAssignableUsers(term: string): Promise<AssignableUser[]> {
  const users = await db.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      photoKey: true,
      _count: { select: { sessionParticipation: { where: { session: { term } } } } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    photoKey: u.photoKey,
    assignmentsThisTerm: u._count.sessionParticipation,
  }));
}

/** Sessions (today or later) the user is rostered for. Safe for volunteers: filtered by their id. */
export async function listMyUpcomingSessions(userId: string) {
  const rows = await db.sessionVolunteer.findMany({
    where: { userId, session: { date: { gte: todayUtc() } } },
    select: {
      role: true,
      session: { select: { id: true, date: true, type: true, title: true, topic: true, location: true } },
    },
    orderBy: { session: { date: "asc" } },
  });
  return rows.map((r) => ({ ...r.session, role: (r.role ?? "presenter") as SessionRole }));
}

/** Ids of every session the user is rostered for (used to sort the hours form's session picker). */
export async function listMySessionIds(userId: string): Promise<Set<string>> {
  const rows = await db.sessionVolunteer.findMany({ where: { userId }, select: { sessionId: true } });
  return new Set(rows.map((r) => r.sessionId));
}
