import "server-only";
import { db } from "@/lib/db";
import { LEADERSHIP_ROLES } from "@/lib/constants";
import { daysSince } from "@/lib/utils";

/** Editable keys on the General tab. Other keys in SiteSetting are left alone. */
export const SITE_SETTING_KEYS = ["mission", "tagline", "hero_note", "contact_email", "instagram_url"] as const;
export type SiteSettingKey = (typeof SITE_SETTING_KEYS)[number];

/** Resources older than this (or never verified) are highlighted as stale. */
export const STALE_AFTER_DAYS = 180;

export async function getSiteSettings(): Promise<Record<SiteSettingKey, string>> {
  const rows = await db.siteSetting.findMany({ where: { key: { in: [...SITE_SETTING_KEYS] } } });
  const out = Object.fromEntries(SITE_SETTING_KEYS.map((k) => [k, ""])) as Record<SiteSettingKey, string>;
  for (const r of rows) out[r.key as SiteSettingKey] = r.value;
  return out;
}

/** Admin accounts in the order the public site shows them: LEADERSHIP_ROLES order, then name. */
export async function listLeadership() {
  const people = await db.user.findMany({
    where: { role: { in: ["ADMIN", "MAIN_ADMIN"] }, isActive: true },
    select: { id: true, firstName: true, lastName: true, role: true, leadershipTitle: true, bio: true, photoUrl: true, showOnPublicSite: true },
  });
  const rank = (t: string | null) => {
    const i = t ? (LEADERSHIP_ROLES as readonly string[]).indexOf(t) : -1;
    return i === -1 ? LEADERSHIP_ROLES.length : i;
  };
  return people.sort(
    (a, b) => rank(a.leadershipTitle) - rank(b.leadershipTitle) || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
  );
}

export async function listPartners() {
  return db.communityPartner.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
}

export async function listResources() {
  const rows = await db.localResource.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { owner: { select: { id: true, firstName: true, lastName: true } } },
  });
  return rows.map((r) => ({
    ...r,
    isStale: !r.lastVerifiedAt || daysSince(r.lastVerifiedAt) >= STALE_AFTER_DAYS,
  }));
}

/** Volunteers who chose to appear on the public site. Read-only here. */
export async function listPublicOptIns() {
  return db.user.findMany({
    where: { publicHoursOptIn: true, isActive: true },
    select: { id: true, firstName: true, lastName: true, role: true, hoursLogs: { select: { hours: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  }).then((rows) => rows.map((r) => ({ ...r, totalHours: r.hoursLogs.reduce((s, h) => s + h.hours, 0) })));
}
