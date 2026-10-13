import "server-only";
import { db } from "@/lib/db";
import { LEADERSHIP_ROLES } from "@/lib/constants";
import { safeJsonParse } from "@/lib/utils";
import { computeYearMetrics, type YearMetrics } from "@/lib/reports/metrics";

/**
 * Read-only queries for the PUBLIC website.
 *
 * Everything in this file is shown to anyone on the internet, so each query
 * selects ONLY what the public is allowed to see:
 *   - aggregate numbers (counts, sums)
 *   - leadership profiles that have showOnPublicSite = true
 *   - volunteer names + hours ONLY when publicHoursOptIn = true
 *   - published annual reports, published local resources, partners
 *   - SiteSetting values
 *
 * Never add emails, phone numbers, applicant data, or anything about shelter
 * residents here. If you need a new public field, add it to the `select`
 * block on purpose rather than returning whole rows.
 */

// ───────────────────────── Site settings ─────────────────────────

/** The SiteSetting keys the public site reads (seeded in prisma/seed.ts). */
export const PUBLIC_SETTING_KEYS = ["mission", "tagline", "hero_note", "contact_email", "instagram_url"] as const;
export type PublicSettings = Record<(typeof PUBLIC_SETTING_KEYS)[number], string>;

export async function getSiteSettings(): Promise<PublicSettings> {
  const rows = await db.siteSetting.findMany({ where: { key: { in: [...PUBLIC_SETTING_KEYS] } } });
  const out = {} as PublicSettings;
  for (const key of PUBLIC_SETTING_KEYS) {
    out[key] = rows.find((r) => r.key === key)?.value.trim() ?? "";
  }
  return out;
}

// ───────────────────────── Program stats ─────────────────────────

export type PublicStats = {
  formalSessions: number;
  informalSessions: number;
  distinctTopics: number;
  participants: number;
  /** All logged volunteer hours, rounded to a whole number. */
  volunteerHours: number;
  /** The next scheduled session (date + topic only), or null. */
  nextSession: { date: Date; topic: string | null } | null;
};

/** Headline numbers for the home page. Only sessions that already happened count. */
export async function getPublicStats(): Promise<PublicStats> {
  const now = new Date();
  const [past, hours, next] = await Promise.all([
    db.sessionRecord.findMany({
      where: { date: { lte: now } },
      select: { type: true, topic: true, participantCount: true },
    }),
    db.hoursLog.aggregate({ _sum: { hours: true } }),
    db.sessionRecord.findFirst({
      where: { date: { gt: now } },
      orderBy: { date: "asc" },
      select: { date: true, topic: true },
    }),
  ]);
  const formal = past.filter((s) => s.type === "FORMAL");
  return {
    formalSessions: formal.length,
    informalSessions: past.filter((s) => s.type === "INFORMAL").length,
    distinctTopics: countDistinctTopics(formal),
    participants: past.reduce((sum, s) => sum + s.participantCount, 0),
    volunteerHours: Math.round(hours._sum.hours ?? 0),
    nextSession: next,
  };
}

function countDistinctTopics(sessions: { topic: string | null }[]) {
  const set = new Set<string>();
  for (const s of sessions) {
    const t = s.topic?.trim().toLowerCase();
    if (t) set.add(t);
  }
  return set.size;
}

/** Topics taught in past formal sessions, most recent first (one entry per topic). */
export async function getFormalTopics(): Promise<{ topic: string; lastTaught: Date; timesTaught: number }[]> {
  const rows = await db.sessionRecord.findMany({
    where: { type: "FORMAL", date: { lte: new Date() }, topic: { not: null } },
    orderBy: { date: "desc" },
    select: { topic: true, date: true },
  });
  const byTopic = new Map<string, { topic: string; lastTaught: Date; timesTaught: number }>();
  for (const r of rows) {
    const topic = r.topic!.trim();
    const key = topic.toLowerCase();
    const existing = byTopic.get(key);
    if (existing) existing.timesTaught += 1;
    else byTopic.set(key, { topic, lastTaught: r.date, timesTaught: 1 });
  }
  return [...byTopic.values()];
}

/** Upcoming sessions: date + topic only. */
export async function getUpcomingSessions(limit = 6) {
  return db.sessionRecord.findMany({
    where: { date: { gt: new Date() } },
    orderBy: { date: "asc" },
    take: limit,
    select: { id: true, date: true, topic: true, type: true },
  });
}

// ───────────────────────── Per-year metrics ─────────────────────────

/**
 * Academic years that have at least one past session, newest first.
 * The per-year numbers themselves come from computeYearMetrics() in
 * src/lib/reports/metrics.ts so the public site and the annual reports
 * always agree.
 */
export async function getSessionYears(): Promise<number[]> {
  const rows = await db.sessionRecord.findMany({
    where: { date: { lte: new Date() } },
    select: { year: true },
    distinct: ["year"],
    orderBy: { year: "desc" },
  });
  return rows.map((r) => r.year);
}

/** Live per-year metrics for every year with sessions, newest first. */
export async function getPublicYearMetrics(): Promise<YearMetrics[]> {
  const years = await getSessionYears();
  return Promise.all(years.map((y) => computeYearMetrics(y)));
}

// ───────────────────────── People ─────────────────────────

export type LeadershipProfile = {
  id: string;
  firstName: string;
  lastName: string;
  leadershipTitle: string | null;
  bio: string | null;
  /** Uploaded photo (served via /api/files/[key]). */
  photoKey: string | null;
  /** Legacy external photo link, used only when there is no uploaded photo. */
  photoUrl: string | null;
};

/** Leadership profiles that opted to appear publicly, in LEADERSHIP_ROLES order then by name. */
export async function getLeadershipProfiles(limit?: number): Promise<LeadershipProfile[]> {
  const rows = await db.user.findMany({
    where: { showOnPublicSite: true, isActive: true },
    select: { id: true, firstName: true, lastName: true, leadershipTitle: true, bio: true, photoKey: true, photoUrl: true },
  });
  const rank = (title: string | null) => {
    const i = LEADERSHIP_ROLES.indexOf((title ?? "") as (typeof LEADERSHIP_ROLES)[number]);
    return i === -1 ? LEADERSHIP_ROLES.length : i;
  };
  rows.sort((a, b) => rank(a.leadershipTitle) - rank(b.leadershipTitle) || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  return limit ? rows.slice(0, limit) : rows;
}

/**
 * One public profile page (/team/[id]). Only people who turned on
 * "Show on the public site" are returned; everyone else is null (-> 404).
 * Fields are the public-safe ones only: no email, phone or username.
 */
export async function getPublicProfile(id: string) {
  const u = await db.user.findFirst({
    where: { id, showOnPublicSite: true, isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      leadershipTitle: true,
      pronouns: true,
      major: true,
      graduationDate: true,
      bio: true,
      profileBody: true,
      photoKey: true,
      photoUrl: true,
      _count: { select: { sessionParticipation: true } },
    },
  });
  if (!u) return null;
  const { _count, ...rest } = u;
  return { ...rest, sessionsCount: _count.sessionParticipation };
}

/** "Class of 2027" from a graduation date, or null when unknown. */
export function classYearLabel(graduationDate: Date | null | undefined) {
  return graduationDate ? `Class of ${graduationDate.getUTCFullYear()}` : null;
}

export type OptInVolunteer = { id: string; firstName: string; lastName: string; hours: number; photoKey: string | null };

/**
 * Volunteers who chose to be listed publicly, with their total hours.
 * Alphabetical by last name on purpose: this is a list, not a ranking.
 */
export async function getOptInVolunteers(): Promise<OptInVolunteer[]> {
  const rows = await db.user.findMany({
    where: { publicHoursOptIn: true, isActive: true },
    select: { id: true, firstName: true, lastName: true, photoKey: true, hoursLogs: { select: { hours: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return rows.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    photoKey: u.photoKey,
    hours: Math.round(u.hoursLogs.reduce((sum, h) => sum + h.hours, 0) * 2) / 2, // nearest half hour
  }));
}

// ───────────────────────── Partners & resources ─────────────────────────

export async function getPartners() {
  return db.communityPartner.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, description: true, url: true, logoKey: true },
  });
}

// ───────────────────────── Logos & public documents ─────────────────────────

/**
 * A logo stored as a Document (category LOGO) whose title contains `titleContains`,
 * e.g. "Colby" or "Mid-Maine". Returns the key to pass to /api/files/[key], or null.
 */
export async function getLogo(titleContains: string): Promise<{ fileKey: string; title: string } | null> {
  return db.document.findFirst({
    where: { category: "LOGO", kind: "IMAGE", title: { contains: titleContains, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    select: { fileKey: true, title: true },
  });
}

/** Public brochure PDFs with the date of the session they belong to, newest session first. */
export async function getPublicBrochures() {
  const rows = await db.document.findMany({
    where: { category: "BROCHURE", isPublic: true, kind: "PDF" },
    select: { id: true, title: true, fileKey: true, session: { select: { date: true, topic: true } } },
  });
  return rows.sort((a, b) => (b.session?.date.getTime() ?? 0) - (a.session?.date.getTime() ?? 0));
}

/** The most recent public image in the GENERAL category (used for the recruitment poster), or null. */
export async function getPublicPoster() {
  return db.document.findFirst({
    where: { category: "GENERAL", isPublic: true, kind: "IMAGE" },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, fileKey: true, fileName: true, kind: true },
  });
}

export type PublicResource = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  url: string | null;
  phone: string | null;
  address: string | null;
  lastVerifiedAt: Date | null;
  /** Owner shown as first name + role title only. */
  owner: { firstName: string; leadershipTitle: string | null } | null;
};

/** Published local resources grouped by category (categories in the order they first appear). */
export async function getPublishedResourcesByCategory(): Promise<{ category: string; items: PublicResource[] }[]> {
  const rows = await db.localResource.findMany({
    where: { isPublished: true },
    orderBy: [{ category: "asc" }, { order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      url: true,
      phone: true,
      address: true,
      lastVerifiedAt: true,
      owner: { select: { firstName: true, leadershipTitle: true } },
    },
  });
  const groups: { category: string; items: PublicResource[] }[] = [];
  for (const r of rows) {
    let g = groups.find((x) => x.category === r.category);
    if (!g) {
      g = { category: r.category, items: [] };
      groups.push(g);
    }
    g.items.push(r);
  }
  return groups;
}

// ───────────────────────── Annual reports ─────────────────────────

export type ReportMetrics = {
  formalSessions?: number;
  informalSessions?: number;
  participants?: number;
  hours?: number;
  volunteers?: number;
  topics?: string[];
};
export type ReportQuote = { text: string; attribution?: string };

export async function getPublishedReports() {
  return db.annualReport.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { year: "desc" },
    select: { year: true, title: true, summary: true, publishedAt: true },
  });
}

/** One published report with its JSON fields parsed. Returns null if missing or unpublished. */
export async function getPublishedReport(year: number) {
  if (!Number.isInteger(year)) return null;
  const r = await db.annualReport.findFirst({
    where: { year, status: "PUBLISHED" },
    select: { year: true, title: true, summary: true, narrative: true, highlights: true, quotes: true, metricsSnapshot: true, publishedAt: true },
  });
  if (!r) return null;
  return {
    year: r.year,
    title: r.title,
    summary: r.summary,
    narrative: r.narrative,
    publishedAt: r.publishedAt,
    highlights: safeJsonParse<string[]>(r.highlights, []).filter((h) => typeof h === "string" && h.trim()),
    quotes: safeJsonParse<ReportQuote[]>(r.quotes, []).filter((q) => q && typeof q.text === "string" && q.text.trim()),
    metrics: normalizeReportMetrics(safeJsonParse<Record<string, unknown> | null>(r.metricsSnapshot, null)),
  };
}

/**
 * A snapshot may have been written by publishReportAction (the full
 * YearMetrics shape from src/lib/reports/metrics.ts) or by the demo seed
 * (a shorter shape). Accept both and return the small public shape.
 */
function normalizeReportMetrics(raw: Record<string, unknown> | null): ReportMetrics | null {
  if (!raw || typeof raw !== "object") return null;
  const num = (...keys: string[]) => {
    for (const k of keys) if (typeof raw[k] === "number") return raw[k] as number;
    return undefined;
  };
  const list = (...keys: string[]) => {
    for (const k of keys) if (Array.isArray(raw[k])) return (raw[k] as unknown[]).filter((t): t is string => typeof t === "string");
    return undefined;
  };
  return {
    formalSessions: num("formalSessions"),
    informalSessions: num("informalSessions"),
    participants: num("participants", "totalParticipants"),
    hours: num("hours", "totalVolunteerHours"),
    volunteers: num("volunteers", "activeVolunteers"),
    topics: list("topics", "formalTopics"),
  };
}

/** Live numbers for a report year (used when a published report has no snapshot). */
export async function getLiveReportMetrics(year: number): Promise<ReportMetrics> {
  const m = await computeYearMetrics(year);
  return {
    formalSessions: m.formalSessions,
    informalSessions: m.informalSessions,
    participants: m.totalParticipants,
    hours: Math.round(m.totalVolunteerHours),
    volunteers: m.activeVolunteers,
    topics: m.formalTopics,
  };
}
