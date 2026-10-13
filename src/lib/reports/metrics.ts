import "server-only";
import { db } from "@/lib/db";
import { HOURS_TYPES } from "@/lib/constants";

/**
 * Live metrics for one academic year (Aug 1 of `year` → Jul 31 of `year + 1`).
 * Used by the annual report builder, the printable view, the CSV export and
 * the public /reports/[year] page. Everything is aggregate: no names, no
 * resident data, only counts and sums.
 */

export type YearMetrics = {
  year: number;
  /** ISO dates of the window, handy for display. */
  from: string;
  to: string;
  formalSessions: number;
  informalSessions: number;
  totalSessions: number;
  /** Distinct topics of FORMAL sessions, in date order. */
  formalTopics: string[];
  /** Sum of participantCount across all sessions (residents attending; counts only). */
  totalParticipants: number;
  totalVolunteerHours: number;
  /** Hours split by HoursLog.type (keys from HOURS_TYPES). */
  hoursByType: Record<(typeof HOURS_TYPES)[number], number>;
  /** Anyone with an HoursLog or SessionVolunteer row inside the window. */
  activeVolunteers: number;
  applicationsReceived: number;
  applicationsAccepted: number;
  /** ModuleCompletion rows inside the window (course modules finished). */
  modulesCompleted: number;
  computedAt: string;
};

export function yearWindow(year: number) {
  const from = new Date(Date.UTC(year, 7, 1)); // Aug 1
  const to = new Date(Date.UTC(year + 1, 7, 1)); // exclusive: Aug 1 next year
  return { from, to };
}

export async function computeYearMetrics(year: number): Promise<YearMetrics> {
  const { from, to } = yearWindow(year);
  const inWindow = { gte: from, lt: to };

  const [sessions, hoursLogs, sessionVolunteers, applicationsReceived, applicationsAccepted, modulesCompleted] =
    await Promise.all([
      db.sessionRecord.findMany({
        where: { date: inWindow },
        select: { type: true, topic: true, title: true, participantCount: true, date: true },
        orderBy: { date: "asc" },
      }),
      db.hoursLog.findMany({ where: { date: inWindow }, select: { userId: true, hours: true, type: true } }),
      db.sessionVolunteer.findMany({ where: { session: { date: inWindow } }, select: { userId: true } }),
      db.application.count({ where: { submittedAt: inWindow } }),
      db.application.count({ where: { submittedAt: inWindow, status: "ACCEPTED" } }),
      db.moduleCompletion.count({ where: { completedAt: inWindow } }),
    ]);

  const formal = sessions.filter((s) => s.type === "FORMAL");
  const informal = sessions.filter((s) => s.type === "INFORMAL");
  const formalTopics = Array.from(
    new Set(formal.map((s) => (s.topic ?? s.title ?? "").trim()).filter(Boolean)),
  );

  const hoursByType = Object.fromEntries(HOURS_TYPES.map((t) => [t, 0])) as YearMetrics["hoursByType"];
  let totalVolunteerHours = 0;
  const activeIds = new Set<string>();
  for (const h of hoursLogs) {
    totalVolunteerHours += h.hours;
    if (h.type in hoursByType) hoursByType[h.type as keyof typeof hoursByType] += h.hours;
    activeIds.add(h.userId);
  }
  for (const sv of sessionVolunteers) activeIds.add(sv.userId);
  for (const k of HOURS_TYPES) hoursByType[k] = round1(hoursByType[k]);

  return {
    year,
    from: from.toISOString().slice(0, 10),
    to: new Date(to.getTime() - 86_400_000).toISOString().slice(0, 10),
    formalSessions: formal.length,
    informalSessions: informal.length,
    totalSessions: sessions.length,
    formalTopics,
    totalParticipants: sessions.reduce((s, x) => s + x.participantCount, 0),
    totalVolunteerHours: round1(totalVolunteerHours),
    hoursByType,
    activeVolunteers: activeIds.size,
    applicationsReceived,
    applicationsAccepted,
    modulesCompleted,
    computedAt: new Date().toISOString(),
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
