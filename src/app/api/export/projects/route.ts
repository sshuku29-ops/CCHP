import { actionModule, AuthError } from "@/lib/auth/guards";
import { csvResponse, toCsv } from "@/lib/csv";
import { projectsForExport } from "@/lib/projects/queries";

/** GET /api/export/projects — every project with goal, owner, status, dates and progress. Admins with the projects module only. */
export async function GET() {
  try {
    await actionModule("projects");
  } catch (e) {
    if (e instanceof AuthError) return new Response("Forbidden", { status: e.status });
    throw e;
  }
  const rows = await projectsForExport();
  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(`cchp-projects-${stamp}.csv`, toCsv(rows, [
    "id",
    "title",
    "goal",
    "term",
    "owner",
    "status",
    "startDate",
    "dueDate",
    "tasksTotal",
    "tasksDone",
    "percentDone",
    "description",
  ]));
}
