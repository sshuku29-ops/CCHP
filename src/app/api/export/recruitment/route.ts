import { actionModule, AuthError } from "@/lib/auth/guards";
import { rankApplications } from "@/lib/recruitment/queries";
import { toCsv, csvResponse } from "@/lib/csv";
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from "@/lib/recruitment/helpers";

/**
 * GET /api/export/recruitment?cycleId=…
 * CSV of the ranked list for one cycle. Admin-only, so it includes names and
 * emails (this is what the team uses for manual follow-up email).
 */
export async function GET(request: Request) {
  let user;
  try {
    user = await actionModule("recruitment");
  } catch (e) {
    if (e instanceof AuthError) return new Response(e.message, { status: e.status });
    throw e;
  }
  const cycleId = new URL(request.url).searchParams.get("cycleId") ?? "";
  const data = await rankApplications(cycleId, user.id);
  if (!data) return new Response("Cycle not found", { status: 404 });

  const rows = data.applications.map((a, i) => ({
    rank: i + 1,
    code: a.code,
    firstName: a.firstName,
    lastName: a.lastName,
    email: a.email,
    phone: a.phone ?? "",
    affiliation: a.affiliation ?? "",
    status: APPLICATION_STATUS_LABELS[a.status as ApplicationStatus] ?? a.status,
    flaggedForInterview: a.flaggedForInterview ? "yes" : "no",
    averageScore: a.average === null ? "" : a.average.toFixed(2),
    maxScore: data.maxTotal,
    reviewersComplete: a.reviewersComplete,
    reviewersScored: a.reviewersScored,
    submittedAt: a.submittedAt.toISOString(),
  }));
  const safeName = data.cycle.slug.replace(/[^a-z0-9-]/gi, "") || "cycle";
  return csvResponse(`applications-${safeName}.csv`, toCsv(rows));
}
