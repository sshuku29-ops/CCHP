import { actionModule, AuthError } from "@/lib/auth/guards";
import { csvResponse, toCsv } from "@/lib/csv";
import { HOURS_TYPE_LABELS, HOURS_TYPES } from "@/lib/constants";
import { academicYearForDate, academicYearLabel } from "@/lib/dates";
import { computeYearMetrics } from "@/lib/reports/metrics";

/** CSV of the computed metrics for one academic year: /api/export/reports?year=2025 */
export async function GET(req: Request) {
  try {
    await actionModule("reports");
  } catch (e) {
    if (e instanceof AuthError) return new Response(e.message, { status: e.status });
    throw e;
  }
  const raw = new URL(req.url).searchParams.get("year") ?? "";
  const year = /^\d{4}$/.test(raw) ? Number(raw) : academicYearForDate(new Date());
  const m = await computeYearMetrics(year);
  const rows: { metric: string; value: string | number }[] = [
    { metric: "Academic year", value: academicYearLabel(year) },
    { metric: "Window", value: `${m.from} to ${m.to}` },
    { metric: "Formal sessions", value: m.formalSessions },
    { metric: "Informal sessions", value: m.informalSessions },
    { metric: "Total sessions", value: m.totalSessions },
    { metric: "Formal topics", value: m.formalTopics.join("; ") },
    { metric: "Total participants", value: m.totalParticipants },
    { metric: "Total volunteer hours", value: m.totalVolunteerHours },
    ...HOURS_TYPES.map((t) => ({ metric: `Hours: ${HOURS_TYPE_LABELS[t]}`, value: m.hoursByType[t] })),
    { metric: "Active volunteers", value: m.activeVolunteers },
    { metric: "Applications received", value: m.applicationsReceived },
    { metric: "Applications accepted", value: m.applicationsAccepted },
    { metric: "Training modules completed", value: m.modulesCompleted },
    { metric: "Computed at", value: m.computedAt },
  ];
  return csvResponse(`annual-report-metrics-${year}.csv`, toCsv(rows, ["metric", "value"]));
}
