import "server-only";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/constants";

/** Fields the users table / edit page need. Never includes the password hash. */
const userListSelect = {
  id: true,
  username: true,
  email: true,
  role: true,
  allowedModules: true,
  firstName: true,
  lastName: true,
  leadershipTitle: true,
  isActive: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export type UserRow = Awaited<ReturnType<typeof listUsers>>[number];

/** All users, admins first, then by name. */
export async function listUsers() {
  const users = await db.user.findMany({ select: userListSelect });
  const rank = (role: string) => ROLES.indexOf(role as (typeof ROLES)[number]);
  return users.sort((a, b) => rank(a.role) - rank(b.role) || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
}

/** One user plus the counts that decide whether the account can be deleted. */
export async function getUserForEdit(id: string) {
  return db.user.findUnique({
    where: { id },
    select: {
      ...userListSelect,
      _count: { select: { hoursLogs: true, submissions: true, sessionParticipation: true } },
    },
  });
}

/** Numbers and lists shown on the /settings overview page. */
export async function getSettingsOverview() {
  const now = new Date();
  const [usersByRole, activeUsers, activeSessions, recentActivity] = await Promise.all([
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    db.user.count({ where: { isActive: true } }),
    db.session.count({ where: { expiresAt: { gt: now } } }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { actor: { select: { firstName: true, lastName: true, username: true } } },
    }),
  ]);
  const counts: Record<string, number> = {};
  for (const r of usersByRole) counts[r.role] = r._count._all;
  return { usersByRole: counts, activeUsers, activeSessions, recentActivity };
}

/**
 * Which environment variables are configured. We only ever report "set" or
 * "not set" — the values themselves never leave the server.
 */
export function getEnvChecklist() {
  const isSet = (name: string) => Boolean(process.env[name] && process.env[name]!.trim() !== "");
  return [
    { name: "EMAIL_PROVIDER", set: isSet("EMAIL_PROVIDER"), hint: '"console" logs emails locally; "resend" sends them' },
    { name: "RESEND_API_KEY", set: isSet("RESEND_API_KEY"), hint: "Needed only when EMAIL_PROVIDER=resend" },
    { name: "CRON_SECRET", set: isSet("CRON_SECRET"), hint: "Protects the reminder cron endpoints" },
    { name: "UPLOAD_DIR", set: isSet("UPLOAD_DIR"), hint: "Folder for small assignment uploads" },
    { name: "APP_URL", set: isSet("APP_URL"), hint: "Public URL used in email links" },
  ];
}
