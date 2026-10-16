import { actionModule, AuthError } from "@/lib/auth/guards";
import { csvResponse, toCsv } from "@/lib/csv";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { currentTermLabel, listVolunteers } from "@/lib/records/queries";

/** CSV of the volunteer directory, honouring the same filters as /volunteers. Admins only. */
export async function GET(req: Request) {
  try {
    await actionModule("volunteers");
  } catch (e) {
    if (e instanceof AuthError) return new Response(e.message, { status: e.status });
    throw e;
  }
  const sp = new URL(req.url).searchParams;
  const active = sp.get("active");
  const rows = await listVolunteers({
    role: sp.get("role") ?? undefined,
    active: active === "inactive" || active === "all" ? active : "active",
    term: sp.get("term") ?? undefined,
    q: sp.get("q") ?? undefined,
  });
  const thisTerm = currentTermLabel();
  const csv = toCsv(
    rows.map((v) => ({
      last_name: v.lastName,
      first_name: v.firstName,
      email: v.email ?? "",
      phone: v.phone ?? "",
      graduation_date: v.graduationDate,
      has_vehicle: v.hasVehicle ? "yes" : "no",
      role: ROLE_LABELS[v.role as Role] ?? v.role,
      active: v.isActive ? "yes" : "no",
      sessions_participated: v.sessionsCount,
      [`hours_${thisTerm.toLowerCase().replace(/\s+/g, "_")}`]: v.hoursThisTerm,
      hours_all_time: v.hoursAllTime,
      public_opt_in: v.publicHoursOptIn ? "yes" : "no",
    })),
  );
  return csvResponse(`volunteers-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
