import { actionModule, AuthError } from "@/lib/auth/guards";
import { csvResponse, toCsv } from "@/lib/csv";
import { tasksForExport } from "@/lib/projects/queries";

/** GET /api/export/tasks — every task with project, status, assignees and dates. Admins with the projects module only. */
export async function GET() {
  try {
    await actionModule("projects");
  } catch (e) {
    if (e instanceof AuthError) return new Response("Forbidden", { status: e.status });
    throw e;
  }
  const rows = await tasksForExport();
  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(`cchp-tasks-${stamp}.csv`, toCsv(rows, [
    "id",
    "title",
    "project",
    "goal",
    "status",
    "priority",
    "needsOwner",
    "assignees",
    "startDate",
    "dueDate",
    "completedAt",
    "createdAt",
    "description",
  ]));
}
