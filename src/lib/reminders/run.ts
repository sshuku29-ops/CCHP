import "server-only";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { fmtDate } from "@/lib/dates";
import { daysSince } from "@/lib/utils";

/**
 * The reminder job. Run once a day (see docs/REMINDERS.md). It does three things:
 *
 *  1. Creates in-app notifications for tasks due within 2 days (TASK_DUE)
 *     and overdue tasks (TASK_OVERDUE), one per assignee.
 *  2. Creates WAITING_ON notifications for outreach owners whose follow-up
 *     date (sentAt + remindAfterDays) has passed.
 *  3. Sends ONE email digest per user who has an email address, listing their
 *     due/overdue tasks and, for admins, overdue follow-ups and session dates
 *     in the next 7 days. Users with nothing to report get no email.
 *
 * Safe to run more than once a day: notifications are de-duplicated (no new
 * one if an unread notification with the same type + link was created in the
 * last 24 hours). Emails are NOT de-duplicated, so schedule this once daily.
 */

export type ReminderCounts = {
  taskDue: number;
  taskOverdue: number;
  waitingOn: number;
  emails: number;
};

const DAY = 86_400_000;

/** UTC midnight for the given moment — matches how date-only fields are stored. */
function utcMidnight(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function appUrl(path: string) {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

export async function runReminders(now = new Date()): Promise<ReminderCounts> {
  const today = utcMidnight(now);
  const dueSoonEnd = new Date(today.getTime() + 3 * DAY); // today, tomorrow, day after
  const weekEnd = new Date(today.getTime() + 7 * DAY);

  // ── Gather everything we might need to talk about ──────────────────────
  const [tasks, waiting, sessions, recentUnread] = await Promise.all([
    db.task.findMany({
      where: { status: { not: "DONE" }, dueDate: { not: null, lt: dueSoonEnd } },
      select: {
        id: true,
        title: true,
        dueDate: true,
        assignees: { select: { user: { select: { id: true, isActive: true } } } },
      },
    }),
    db.waitingOn.findMany({
      where: { status: "WAITING", ownerId: { not: null } },
      select: { id: true, contactName: true, organization: true, sentAt: true, remindAfterDays: true, ownerId: true },
    }),
    db.sessionRecord.findMany({
      where: { date: { gte: today, lt: weekEnd } },
      select: { id: true, date: true, type: true, topic: true, title: true },
      orderBy: { date: "asc" },
    }),
    // Unread notifications from the last 24h, used to avoid duplicates.
    db.notification.findMany({
      where: {
        readAt: null,
        type: { in: ["TASK_DUE", "TASK_OVERDUE", "WAITING_ON"] },
        createdAt: { gte: new Date(now.getTime() - DAY) },
      },
      select: { userId: true, type: true, href: true },
    }),
  ]);

  const seen = new Set(recentUnread.map((n) => `${n.userId}|${n.type}|${n.href ?? ""}`));
  const toCreate: { userId: string; type: string; title: string; body: string; href: string }[] = [];
  const counts: ReminderCounts = { taskDue: 0, taskOverdue: 0, waitingOn: 0, emails: 0 };

  /** Queue a notification unless the same one was already sent (and is still unread). */
  function queue(n: { userId: string; type: string; title: string; body: string; href: string }) {
    const key = `${n.userId}|${n.type}|${n.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    toCreate.push(n);
    return true;
  }

  // Per-user digest content, filled in as we go.
  type Digest = {
    dueTasks: { title: string; due: Date }[];
    overdueTasks: { title: string; due: Date }[];
    followUps: { label: string; days: number }[];
  };
  const digests = new Map<string, Digest>();
  const digestFor = (userId: string) => {
    let d = digests.get(userId);
    if (!d) {
      d = { dueTasks: [], overdueTasks: [], followUps: [] };
      digests.set(userId, d);
    }
    return d;
  };

  // ── 1. Task reminders ─────────────────────────────────────────────────
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const overdue = t.dueDate < today;
    const href = `/tasks/${t.id}`;
    for (const a of t.assignees) {
      if (!a.user.isActive) continue;
      const created = queue({
        userId: a.user.id,
        type: overdue ? "TASK_OVERDUE" : "TASK_DUE",
        title: overdue ? `Overdue: ${t.title}` : `Due soon: ${t.title}`,
        body: `${overdue ? "Was due" : "Due"} ${fmtDate(t.dueDate)}`,
        href,
      });
      if (created) counts[overdue ? "taskOverdue" : "taskDue"]++;
      (overdue ? digestFor(a.user.id).overdueTasks : digestFor(a.user.id).dueTasks).push({ title: t.title, due: t.dueDate });
    }
  }

  // ── 2. Outreach follow-ups ────────────────────────────────────────────
  for (const w of waiting) {
    const followUpAt = new Date(w.sentAt.getTime() + w.remindAfterDays * DAY);
    if (followUpAt > now || !w.ownerId) continue;
    const label = `${w.contactName}${w.organization ? ` (${w.organization})` : ""}`;
    const days = daysSince(w.sentAt, now);
    const created = queue({
      userId: w.ownerId,
      type: "WAITING_ON",
      title: `Follow up with ${label}`,
      body: `Sent ${days} day${days === 1 ? "" : "s"} ago with no reply yet.`,
      href: `/waiting-on?focus=${w.id}`,
    });
    if (created) counts.waitingOn++;
    digestFor(w.ownerId).followUps.push({ label, days });
  }

  if (toCreate.length > 0) {
    await db.notification.createMany({ data: toCreate });
  }

  // ── 3. Email digests ──────────────────────────────────────────────────
  // Admins also hear about upcoming sessions, so load every active user with
  // an email address (not just the ones with tasks).
  const users = await db.user.findMany({
    where: { isActive: true, email: { not: null } },
    select: { id: true, email: true, firstName: true, role: true },
  });
  const sessionLines = sessions.map((s) => {
    const name = s.title ?? s.topic ?? "";
    return `${fmtDate(s.date)} — ${s.type === "FORMAL" ? "Formal" : "Informal"} session${name ? `: ${name}` : ""}`;
  });

  for (const u of users) {
    if (!u.email) continue;
    const admin = u.role === "ADMIN" || u.role === "MAIN_ADMIN";
    const d = digests.get(u.id) ?? { dueTasks: [], overdueTasks: [], followUps: [] };
    const sections: { heading: string; lines: string[]; href: string }[] = [];
    if (d.overdueTasks.length) sections.push({ heading: "Overdue tasks", lines: d.overdueTasks.map((t) => `${t.title} (was due ${fmtDate(t.due)})`), href: "/tasks" });
    if (d.dueTasks.length) sections.push({ heading: "Due in the next 2 days", lines: d.dueTasks.map((t) => `${t.title} (due ${fmtDate(t.due)})`), href: "/tasks" });
    if (admin && d.followUps.length) sections.push({ heading: "Outreach follow-ups due", lines: d.followUps.map((f) => `${f.label} — sent ${f.days} days ago`), href: "/waiting-on" });
    if (admin && sessionLines.length) sections.push({ heading: "Sessions in the next 7 days", lines: sessionLines, href: "/calendar" });
    if (sections.length === 0) continue; // nothing to report → no email

    const { text, html } = renderDigest(u.firstName, sections);
    try {
      await sendEmail(u.email, "CCHP reminders: your daily digest", text, html);
      counts.emails++;
    } catch (err) {
      // One bad address or a provider hiccup should not stop the other digests.
      console.error(`[reminders] email to ${u.email} failed:`, err);
    }
  }

  return counts;
}

/** Plain-text and simple HTML versions of the digest. */
function renderDigest(firstName: string, sections: { heading: string; lines: string[]; href: string }[]) {
  const textParts = [`Hi ${firstName},`, "", "Here is what needs your attention on the CCHP platform:", ""];
  const htmlParts = [`<p>Hi ${escapeHtml(firstName)},</p>`, `<p>Here is what needs your attention on the CCHP platform:</p>`];
  for (const s of sections) {
    textParts.push(s.heading.toUpperCase(), ...s.lines.map((l) => `  - ${l}`), `  ${appUrl(s.href)}`, "");
    htmlParts.push(
      `<h3 style="margin:16px 0 4px">${escapeHtml(s.heading)}</h3>`,
      `<ul>${s.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`,
      `<p><a href="${appUrl(s.href)}">Open in CCHP</a></p>`,
    );
  }
  textParts.push("You get this email once a day when something is due. Update your email on the Account page.");
  htmlParts.push(`<p style="color:#666;font-size:12px">You get this email once a day when something is due. Update your email on the <a href="${appUrl("/account")}">Account page</a>.</p>`);
  return { text: textParts.join("\n"), html: htmlParts.join("\n") };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
