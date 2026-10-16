import { actionModule, AuthError } from "@/lib/auth/guards";
import { listWaitingOn } from "@/lib/outreach/queries";
import { toCsv, csvResponse } from "@/lib/csv";

/** GET /api/export/waiting-on — CSV of every outreach item (admins with the projects module). */
export async function GET() {
  try {
    await actionModule("projects");
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
  const items = await listWaitingOn({ status: "ALL" });
  const rows = items.map((i) => ({
    contact: i.contactName,
    organization: i.organization ?? "",
    whatSent: i.whatSent,
    channel: i.channel ?? "",
    sentAt: i.sentAt,
    daysSinceSent: i.daysSince,
    remindAfterDays: i.remindAfterDays,
    needsFollowUp: i.needsFollowUp ? "yes" : "no",
    owner: i.owner ? `${i.owner.firstName} ${i.owner.lastName}` : "",
    status: i.status,
    repliedAt: i.repliedAt ?? "",
    notes: i.notes ?? "",
  }));
  return csvResponse("waiting-on.csv", toCsv(rows));
}
