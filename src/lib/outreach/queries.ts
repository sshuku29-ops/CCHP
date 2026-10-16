import "server-only";
import { db } from "@/lib/db";
import { daysSince } from "@/lib/utils";

/**
 * Read helpers for the "Waiting on" outreach tracker.
 * There is deliberately NO email open-tracking here: the only thing we
 * compute is how many days have passed since something was sent.
 */

export type WaitingOnFilters = {
  /** One of WAITING_STATUSES, or "ALL" to show everything. */
  status?: string;
  /** When set, only items owned by this user id are returned. */
  ownerId?: string;
};

export async function listWaitingOn(filters: WaitingOnFilters = {}) {
  const rows = await db.waitingOn.findMany({
    where: {
      ...(filters.status && filters.status !== "ALL" ? { status: filters.status } : {}),
      ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
    },
    include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    // Oldest "sent" first so the items that have waited longest are at the top.
    orderBy: [{ status: "asc" }, { sentAt: "asc" }],
  });
  return rows.map((r) => withDerived(r));
}

export async function getWaitingOn(id: string) {
  const row = await db.waitingOn.findUnique({
    where: { id },
    include: { owner: { select: { id: true, firstName: true, lastName: true } } },
  });
  return row ? withDerived(row) : null;
}

/** Adds the computed "days since sent" and "needs follow-up" fields to a row. */
function withDerived<T extends { sentAt: Date; remindAfterDays: number; status: string }>(row: T) {
  const days = daysSince(row.sentAt);
  return {
    ...row,
    daysSince: days,
    needsFollowUp: row.status === "WAITING" && days >= row.remindAfterDays,
    /** The date on which a follow-up becomes due (sentAt + remindAfterDays). */
    followUpAt: new Date(row.sentAt.getTime() + row.remindAfterDays * 86_400_000),
  };
}

/** Admins and Main Admins who can own outreach items (for the owner dropdown). */
export async function listAdminsForSelect() {
  return db.user.findMany({
    where: { role: { in: ["ADMIN", "MAIN_ADMIN"] }, isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}
