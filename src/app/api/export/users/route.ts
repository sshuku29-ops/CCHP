import { actionMainAdmin, AuthError } from "@/lib/auth/guards";
import { listUsers } from "@/lib/admin/queries";
import { toCsv, csvResponse } from "@/lib/csv";
import { ROLE_LABELS, type Role } from "@/lib/constants";

/** GET /api/export/users — Main Admin only. Allowed fields only (no password data). */
export async function GET() {
  try {
    await actionMainAdmin();
  } catch (e) {
    if (e instanceof AuthError) return new Response("Forbidden", { status: e.status });
    throw e;
  }
  const users = await listUsers();
  const rows = users.map((u) => ({
    firstName: u.firstName,
    lastName: u.lastName,
    username: u.username,
    email: u.email ?? "",
    role: ROLE_LABELS[u.role as Role] ?? u.role,
    leadershipTitle: u.leadershipTitle ?? "",
    active: u.isActive ? "yes" : "no",
    mustChangePassword: u.mustChangePassword ? "yes" : "no",
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : "",
    createdAt: u.createdAt.toISOString().slice(0, 10),
  }));
  const today = new Date().toISOString().slice(0, 10);
  return csvResponse(`cchp-users-${today}.csv`, toCsv(rows));
}
