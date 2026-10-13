"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionModule, AuthError } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { fmtDate } from "@/lib/dates";
import type { ActionResult } from "@/lib/action-result";
import { SESSION_ROLES } from "./roles";

/**
 * Save the roster for one session. The form sends:
 *  - userIds        (one checkbox per selected person)
 *  - role_<userId>  (that person's role: presenter | facilitator | support)
 * Rows are added/removed to match; roles are updated; newly added people get a notification.
 */
export async function saveSessionRoster(sessionId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let admin;
  try {
    admin = await actionModule("records");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }

  const session = await db.sessionRecord.findUnique({
    where: { id: sessionId },
    select: { id: true, date: true, title: true, topic: true, volunteers: { select: { userId: true, role: true } } },
  });
  if (!session) return { error: "Session not found." };

  // Only keep ids that belong to active users (never trust the client).
  const requested = Array.from(new Set(fd.getAll("userIds").map(String).filter(Boolean)));
  const valid = requested.length
    ? await db.user.findMany({ where: { id: { in: requested }, isActive: true }, select: { id: true } })
    : [];
  const wanted = new Map<string, string>();
  for (const u of valid) {
    const parsed = z.enum(SESSION_ROLES).safeParse(fd.get(`role_${u.id}`) ?? "presenter");
    wanted.set(u.id, parsed.success ? parsed.data : "presenter");
  }

  const before = new Map(session.volunteers.map((v) => [v.userId, v.role ?? "presenter"]));
  const added = [...wanted.keys()].filter((id) => !before.has(id));
  const removed = [...before.keys()].filter((id) => !wanted.has(id));
  const changed = [...wanted.entries()].filter(([id, role]) => before.has(id) && before.get(id) !== role);

  await db.$transaction([
    ...(removed.length ? [db.sessionVolunteer.deleteMany({ where: { sessionId, userId: { in: removed } } })] : []),
    ...added.map((userId) => db.sessionVolunteer.create({ data: { sessionId, userId, role: wanted.get(userId) } })),
    ...changed.map(([userId, role]) =>
      db.sessionVolunteer.update({ where: { sessionId_userId: { sessionId, userId } }, data: { role } }),
    ),
  ]);

  // Tell newly assigned people. /sessions/[id] is admin-only, so link to the dashboard
  // where "Your upcoming sessions" lists it.
  const targets = added.filter((id) => id !== admin.id);
  if (targets.length) {
    const label = session.title ?? session.topic ?? "a session";
    await notify(targets, {
      type: "ASSIGNED",
      title: `You're on the roster: ${label} (${fmtDate(session.date)})`,
      body: "Check your dashboard for the date, topic and your role.",
      href: "/dashboard",
    });
  }

  await audit(admin.id, "session.roster", sessionId, { added, removed, changed: changed.map(([id]) => id) });
  revalidatePath("/sessions/roster");
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
  revalidatePath("/hours");
  const n = wanted.size;
  return { ok: true, message: `Roster saved: ${n} volunteer${n === 1 ? "" : "s"}.` };
}
