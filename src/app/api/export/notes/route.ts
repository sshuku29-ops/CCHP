import { actionModule, AuthError } from "@/lib/auth/guards";
import { listMeetingNotes } from "@/lib/notes/queries";
import { toCsv, csvResponse } from "@/lib/csv";

/** GET /api/export/notes — CSV of every meeting note (title/date/attendees/summary). Admins with the projects module. */
export async function GET() {
  try {
    await actionModule("projects");
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
  const notes = await listMeetingNotes({});
  const rows = notes.map((n) => ({
    title: n.title,
    date: n.date,
    attendees: n.attendees ?? "",
    summary: n.summary ?? "",
    source: n.source ?? "",
    author: n.createdBy ? `${n.createdBy.firstName} ${n.createdBy.lastName}` : "",
  }));
  return csvResponse("meeting-notes.csv", toCsv(rows, ["title", "date", "attendees", "summary", "source", "author"]));
}
