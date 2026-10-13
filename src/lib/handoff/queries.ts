import "server-only";
import { db } from "@/lib/db";
import { isMainAdmin } from "@/lib/auth/guards";
import type { CurrentUser } from "@/lib/auth/session";
import { LEADERSHIP_ROLES } from "@/lib/constants";

const personSelect = { id: true, firstName: true, lastName: true, leadershipTitle: true } as const;

/** Every handoff doc, in LEADERSHIP_ROLES order, then alphabetical for custom titles. */
export async function listHandoffDocs() {
  const docs = await db.handoffDoc.findMany({
    include: { owner: { select: personSelect }, updatedBy: { select: personSelect } },
  });
  const rank = (t: string) => {
    const i = (LEADERSHIP_ROLES as readonly string[]).indexOf(t);
    return i === -1 ? LEADERSHIP_ROLES.length : i;
  };
  return docs.sort((a, b) => rank(a.roleTitle) - rank(b.roleTitle) || a.roleTitle.localeCompare(b.roleTitle));
}

export async function getHandoffDoc(id: string) {
  return db.handoffDoc.findUnique({
    where: { id },
    include: { owner: { select: personSelect }, updatedBy: { select: personSelect } },
  });
}

/** Active admins (possible doc owners), sorted by name. */
export async function listAdminsForSelect() {
  return db.user.findMany({
    where: { role: { in: ["ADMIN", "MAIN_ADMIN"] }, isActive: true },
    select: personSelect,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

/** Only the doc's owner or a Main Admin may edit its content. */
export function canEditHandoff(user: Pick<CurrentUser, "id" | "role">, doc: { ownerId: string | null }) {
  return isMainAdmin(user) || (doc.ownerId !== null && doc.ownerId === user.id);
}
