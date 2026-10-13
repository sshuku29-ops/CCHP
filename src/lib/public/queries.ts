import "server-only";
import { db } from "@/lib/db";
import { LEADERSHIP_ROLES } from "@/lib/constants";
import { academicYearForDate } from "@/lib/dates";
import { safeJsonParse } from "@/lib/utils";

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

export type YearMetrics = {
  /** Academic year start, e.g. 2025 means Fall 2025 – Summer 2026. */
  year: number;
  formalSessions: number;
  informalSessions: number;
  participants: number;
  hours: number;
  /** Distinct volunteers who logged hours or were on a session that year. */
  activeVolunteers: number;
  topics: string[];
};

/**
 * Per-academic-year totals for the Impact page and the live fallback on
 * report pages. Written here because src/lib/reports/metrics.ts did not exist
 * when the public site was built; if the reports module later exports a
 * `computeYearMetrics`, this can be swapped for it.
 */
export async function getYearMetrics(): Promise<YearMetrics[]> {
  const now = new Date();
  const [sessions, hours] = await Promise.all([
    db.sessionRecord.findMany({
      where: { date: { lte: now } },
      select: { year: true, type: true, topic: true, participantCount: true, volunteers: { select: { userId: true } } },
    }),
    db.hoursLog.findMany({ select: { date: true, hours: true, userId: true } }),
  ]);

  const years = new Map<number, YearMetrics & { volunteerIds: Set<string>; topicSet: Set<string> }>();
  const bucket = (year: number) => {
    let y = years.get(year);
    if (!y) {
      y = { year, formalSessions: 0, informalSessions: 0, participants: 0, hours: 0, activeVolunteers: 0, topics: [], volunteerIds: new Set(), topicSet: new Set() };
      years.set(year, y);
    }
    return y;
  };

  for (const s of sessions) {
    const y = bucket(s.year);
    if (s.type === "FORMAL") {
      y.formalSessions += 1;
      const t = s.topic?.trim();
      if (t && !y.topicSet.has(t.toLowerCase())) {
        y.topicSet.add(t.toLowerCase());
        y.topics.push(t);
      }
    } else {
      y.informalSessions += 1;
    }
    y.participants += s.participantCount;
    for (const v of s.volunteers) y.volunteerIds.add(v.userId);
  }
  for (const h of hours) {
    const y = bucket(academicYearForDate(h.date));
    y.hours += h.hours;
    y.volunteerIds.add(h.userId);
  }

  return [...years.values()]
    .map(
      (y): YearMetrics => ({
        year: y.year,
        formalSessions: y.formalSessions,
        informalSessions: y.informalSessions,
        participants: y.participants,
        hours: Math.round(y.hours),
        activeVolunteers: y.volunteerIds.size,
        topics: y.topics,
      }),
    )
    .sort((a, b) => b.year - a.year);
}

// ───────────────────────── People ─────────────────────────

export type LeadershipProfile = {
  id: string;
  firstName: string;
  lastName: string;
  leadershipTitle: string | null;
  bio: string | null;
  photoUrl: string | null;
};

/** Leadership profiles that opted to appear publicly, in LEADERSHIP_ROLES order then by name. */
export async function getLeadershipProfiles(limit?: number): Promise<LeadershipProfile[]> {
  const rows = await db.user.findMany({
    where: { showOnPublicSite: true, isActive: true },
    select: { id: true, firstName: true, lastName: true, leadershipTitle: true, bio: true, photoUrl: true },
  });
  const rank = (title: string | null) => {
    const i = LEADERSHIP_ROLES.indexOf((title ?? "") as (typeof LEADERSHIP_ROLES)[number]);
    return i === -1 ? LEADERSHIP_ROLES.length : i;
  };
  rows.sort((a, b) => rank(a.leadershipTitle) - rank(b.leadershipTitle) || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  return limit ? rows.slice(0, limit) : rows;
}

export type OptInVolunteer = { id: string; firstName: string; lastName: string; hours: number };

/**
 * Volunteers who chose to be listed publicly, with their total hours.
 * Alphabetical by last name on purpose: this is a list, not a ranking.
 */
export async function getOptInVolunteers(): Promise<OptInVolunteer[]> {
  const rows = await db.user.findMany({
    where: { publicHoursOptIn: true, isActive: true },
    select: { id: true, firstName: true, lastName: true, hoursLogs: { select: { hours: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return rows.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    hours: Math.round(u.hoursLogs.reduce((sum, h) => sum + h.hours, 0) * 2) / 2, // nearest half hour
  }));
}

// ───────────────────────── Partners & resources ─────────────────────────

export async function getPartners() {
  return db.communityPartner.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, description: true, url: true },
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
    metrics: safeJsonParse<ReportMetrics | null>(r.metricsSnapshot, null),
  };
}

/** Live metrics for a report year, used when a report has no snapshot. */
export async function getLiveMetricsForYear(year: number): Promise<ReportMetrics> {
  const all = await getYearMetrics();
  const y = all.find((m) => m.year === year);
  if (!y) return { formalSessions: 0, informalSessions: 0, participants: 0, hours: 0, volunteers: 0, topics: [] };
  return {
    formalSessions: y.formalSessions,
    informalSessions: y.informalSessions,
    participants: y.participants,
    hours: y.hours,
    volunteers: y.activeVolunteers,
    topics: y.topics,
  };
}
