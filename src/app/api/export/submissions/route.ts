import { actionModule, AuthError } from "@/lib/auth/guards";
import { listSubmissionsForReview } from "@/lib/lms/queries";
import { SUBMISSION_STATUSES } from "@/lib/constants";
import { toCsv, csvResponse } from "@/lib/csv";
import { fullName } from "@/lib/utils";

/** GET /api/export/submissions?status= — CSV of assignment submissions for LMS admins. */
export async function GET(req: Request) {
  try {
    await actionModule("lms");
  } catch (e) {
    if (e instanceof AuthError) return new Response(e.message, { status: e.status });
    throw e;
  }
  const raw = new URL(req.url).searchParams.get("status") ?? "";
  const status = (SUBMISSION_STATUSES as readonly string[]).includes(raw) ? raw : undefined;
  const rows = await listSubmissionsForReview(status);
  const csv = toCsv(
    rows.map((s) => ({
      volunteer: fullName(s.user),
      course: s.assignment.module.course.title,
      module: s.assignment.module.title,
      assignment: s.assignment.title,
      submittedAt: s.submittedAt.toISOString(),
      status: s.status,
      text: s.text ?? "",
      videoUrl: s.videoUrl ?? "",
      fileName: s.fileName ?? "",
      feedback: s.feedback ?? "",
      reviewedBy: s.reviewedBy ? fullName(s.reviewedBy) : "",
      reviewedAt: s.reviewedAt?.toISOString() ?? "",
    })),
    ["volunteer", "course", "module", "assignment", "submittedAt", "status", "text", "videoUrl", "fileName", "feedback", "reviewedBy", "reviewedAt"],
  );
  return csvResponse(`cchp-submissions-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
