import { actionModule, AuthError } from "@/lib/auth/guards";
import { csvResponse, toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { SESSION_TYPES } from "@/lib/constants";

/** CSV of session records (same filters as /sessions). Volunteer names are included; residents never are. */
export async function GET(req: Request) {
  try {
    await actionModule("records");
  } catch (e) {
    if (e instanceof AuthError) return new Response(e.message, { status: e.status });
    throw e;
  }
  const sp = new URL(req.url).searchParams;
  const yearRaw = sp.get("year") ?? "";
  const year = /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : undefined;
  const term = sp.get("term") || undefined;
  const typeRaw = sp.get("type") ?? "";
  const type = (SESSION_TYPES as readonly string[]).includes(typeRaw) ? typeRaw : undefined;
  const sessions = await db.sessionRecord.findMany({
    where: { ...(year ? { year } : {}), ...(term ? { term } : {}), ...(type ? { type } : {}) },
    include: {
      materials: true,
      volunteers: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
    },
    orderBy: { date: "desc" },
  });
  const csv = toCsv(
    sessions.map((s) => ({
      date: s.date,
      type: s.type,
      topic: s.topic ?? "",
      title: s.title ?? "",
      participants: s.participantCount,
      location: s.location ?? "",
      term: s.term,
      academic_year: s.year,
      volunteers: s.volunteers.map((v) => `${v.user.firstName} ${v.user.lastName}`).join("; "),
      volunteer_emails: s.volunteers.map((v) => v.user.email ?? "").filter(Boolean).join(";"),
      materials: s.materials.map((m) => `${m.label}|${m.url}`).join(";"),
      notes: s.notes ?? "",
    })),
  );
  return csvResponse(`sessions-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
