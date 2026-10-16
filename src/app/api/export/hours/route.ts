import { actionAdmin, AuthError } from "@/lib/auth/guards";
import { listAllHours, hoursFiltersFromSearchParams, termOf, academicYearOf } from "@/lib/hours/queries";
import { HOURS_TYPE_LABELS } from "@/lib/constants";
import { toCsv, csvResponse } from "@/lib/csv";
import { fullName } from "@/lib/utils";

/** GET /api/export/hours?term=&year=&type=&user= — admin CSV of hours logs (same filters as /hours?tab=all). */
export async function GET(req: Request) {
  try {
    await actionAdmin();
  } catch (e) {
    if (e instanceof AuthError) return new Response(e.message, { status: e.status });
    throw e;
  }
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const rows = await listAllHours(hoursFiltersFromSearchParams(sp));
  const csv = toCsv(
    rows.map((r) => ({
      volunteer: fullName(r.user),
      date: r.date,
      hours: r.hours,
      type: HOURS_TYPE_LABELS[r.type as keyof typeof HOURS_TYPE_LABELS] ?? r.type,
      term: termOf(r.date),
      academicYear: academicYearOf(r.date),
      session: r.sessionRecord ? (r.sessionRecord.title ?? r.sessionRecord.topic ?? r.sessionRecord.type) : "",
      sessionDate: r.sessionRecord?.date ?? "",
      notes: r.notes ?? "",
      loggedAt: r.createdAt.toISOString(),
    })),
    ["volunteer", "date", "hours", "type", "term", "academicYear", "session", "sessionDate", "notes", "loggedAt"],
  );
  return csvResponse(`cchp-hours-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
