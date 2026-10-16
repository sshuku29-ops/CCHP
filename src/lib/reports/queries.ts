import "server-only";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";
import type { YearMetrics } from "./metrics";

export type ReportQuote = { text: string; attribution: string };

export async function listReports() {
  return db.annualReport.findMany({ orderBy: { year: "desc" } });
}

/** One report with its JSON columns already parsed. */
export async function getReport(year: number) {
  const r = await db.annualReport.findUnique({ where: { year } });
  if (!r) return null;
  return {
    ...r,
    highlightsList: safeJsonParse<string[]>(r.highlights, []),
    quotesList: safeJsonParse<ReportQuote[]>(r.quotes, []),
    snapshot: safeJsonParse<YearMetrics | null>(r.metricsSnapshot, null),
  };
}

export type ReportWithParsed = NonNullable<Awaited<ReturnType<typeof getReport>>>;
