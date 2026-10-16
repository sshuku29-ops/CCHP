import "server-only";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { fmtDate } from "@/lib/dates";
import { daysSince } from "@/lib/utils";

/**
 * The reminder job. Run once a day (see docs/REMINDERS.md). It does five things:
 *
 *  1. Creates in-app notifications for tasks due within 2 days (TASK_DUE)
 *     and overdue tasks (TASK_OVERDUE), one per assignee.
 *  2. Creates WAITING_ON notifications for outreach owners whose follow-up
 *     date (sentAt + remindAfterDays) has passed.
 *  3. Session-day reminders (SESSION_REMINDER): for every FORMAL/INFORMAL
 *     session happening today or tomorrow, each assigned volunteer gets an
 *     in-app notification, a line in their email digest and, if they opted in
 *     to texts on their Account page and have a phone, one SMS.
 *  4. Assignment reminders (ASSIGNMENT_DUE): for every training assignment due
 *     within 2 days, every active volunteer who has not submitted yet gets an
 *     in-app notification and a line in their email digest.
 *  5. Sends ONE email digest per user who has an email address, listing all of
 *     the above and, for admins, overdue follow-ups and session dates in the
 *     next 7 days. Users with nothing to report get no email.
 *
 * Safe to run more than once a day: notifications are de-duplicated (no new
 * one if an unread notification with the same type + link was created in the
 * last 24 hours). Texts are only sent when the matching notification was newly
 * created, so they are de-duplicated the same way. Emails are NOT
 * de-duplicated, so schedule this once daily.
 */

export type ReminderCounts = {
  taskDue: number;
  taskOverdue: number;
  waitingOn: number;
  sessionReminders: number;
  assignmentDue: number;
  emails: number;
  sms: number;
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
  const [tasks, waiting, sessions, recentUnread, upcomingSessions, assignments, volunteers] = await Promise.all([
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
        type: { in: ["TASK_DUE", "TASK_OVERDUE", "WAITING_ON", "SESSION_REMINDER", "ASSIGNMENT_DUE"] },
        createdAt: { gte: new Date(now.getTime() - DAY) },
      },
      select: { userId: true, type: true, href: true },
    }),
    // Sessions today or tomorrow (dates are stored at UTC midnight), with the
    // volunteers signed up for them and what we need to email / text them.
    db.sessionRecord.findMany({
      where: { type: { in: ["FORMAL", "INFORMAL"] }, date: { gte: today, lt: new Date(today.getTime() + 2 * DAY) } },
      select: {
        id: true,
        date: true,
        type: true,
        topic: true,
        title: true,
        location: true,
        volunteers: {
          select: { user: { select: { id: true, isActive: true, phone: true, smsOptIn: true } } },
        },
      },
      orderBy: { date: "asc" },
    }),
    // Training assignments due within 2 days, with who already submitted.
    db.assignment.findMany({
      where: { dueDate: { gte: today, lt: dueSoonEnd }, module: { course: { isPublished: true } } },
      select: {
        id: true,
        title: true,
        dueDate: true,
        moduleId: true,
        module: { select: { courseId: true, title: true } },
        submissions: { select: { userId: true } },
      },
    }),
    // Every active volunteer (assignment reminders go to all of them).
    db.user.findMany({ where: { isActive: true, role: "VOLUNTEER" }, select: { id: true } }),
  ]);

  const seen = new Set(recentUnread.map((n) => `${n.userId}|${n.type}|${n.href ?? ""}`));
  const toCreate: { userId: string; type: string; title: string; body: string; href: string }[] = [];
  const counts: ReminderCounts = { taskDue: 0, taskOverdue: 0, waitingOn: 0, sessionReminders: 0, assignmentDue: 0, emails: 0, sms: 0 };

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
    mySessions: { label: string; href: string }[];
    assignments: { title: string; due: Date; href: string }[];
  };
  const emptyDigest = (): Digest => ({ dueTasks: [], overdueTasks: [], followUps: [], mySessions: [], assignments: [] });
  const digests = new Map<string, Digest>();
  const digestFor = (userId: string) => {
    let d = digests.get(userId);
    if (!d) {
      d = emptyDigest();
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

  // ── 3. Session-day reminders (in-app + digest line + optional SMS) ────
  // A text goes out at most ONCE per person per session, so look up every
  // earlier SESSION_REMINDER notification (read or not) for these sessions.
  const sessionHrefs = upcomingSessions.map((s) => `/sessions/${s.id}`);
  const alreadyTexted = new Set(
    sessionHrefs.length === 0
      ? []
      : (
          await db.notification.findMany({
            where: { type: "SESSION_REMINDER", href: { in: sessionHrefs } },
            select: { userId: true, href: true },
          })
        ).map((n) => `${n.userId}|${n.href}`),
  );
  // Texts are queued here and sent after the notifications are saved.
  const textsToSend: { to: string; text: string }[] = [];
  for (const s of upcomingSessions) {
    const name = s.title ?? s.topic ?? "";
    const kind = s.type === "FORMAL" ? "Formal" : "Informal";
    const isToday = s.date.getTime() === today.getTime();
    const when = isToday ? "today" : "tomorrow";
    const label = `${kind} session ${when} (${fmtDate(s.date)})${name ? `: ${name}` : ""}${s.location ? ` at ${s.location}` : ""}`;
    const href = `/sessions/${s.id}`;
    for (const v of s.volunteers) {
      if (!v.user.isActive) continue;
      const created = queue({
        userId: v.user.id,
        type: "SESSION_REMINDER",
        title: `Session ${when}${name ? `: ${name}` : ""}`,
        body: label,
        href,
      });
      digestFor(v.user.id).mySessions.push({ label, href });
      if (!created) continue; // already reminded in the last 24h
      counts.sessionReminders++;
      if (v.user.smsOptIn && v.user.phone && !alreadyTexted.has(`${v.user.id}|${href}`)) {
        textsToSend.push({
          to: v.user.phone,
          text: `CCHP reminder: ${label}. Details: ${appUrl(href)} Reply STOP to opt out.`,
        });
      }
    }
  }

  // ── 4. Assignment due-date reminders ──────────────────────────────────
  // Simple rule: every active volunteer without a submission is reminded.
  for (const a of assignments) {
    if (!a.dueDate) continue;
    const submitted = new Set(a.submissions.map((x) => x.userId));
    const href = `/courses/${a.module.courseId}/modules/${a.moduleId}/assignments/${a.id}`;
    for (const v of volunteers) {
      if (submitted.has(v.id)) continue;
      const created = queue({
        userId: v.id,
        type: "ASSIGNMENT_DUE",
        title: `Assignment due soon: ${a.title}`,
        body: `${a.module.title} · due ${fmtDate(a.dueDate)}`,
        href,
      });
      if (created) counts.assignmentDue++;
      digestFor(v.id).assignments.push({ title: `${a.title} (${a.module.title})`, due: a.dueDate, href });
    }
  }

  if (toCreate.length > 0) {
    await db.notification.createMany({ data: toCreate });
  }

  // Send the texts only now that the notifications (our de-dup record) are saved.
  for (const t of textsToSend) {
    try {
      await sendSms(t.to, t.text);
      counts.sms++;
    } catch (err) {
      // A bad number or provider hiccup should not stop the rest of the job.
      console.error(`[reminders] sms to ${t.to} failed:`, err);
    }
  }

  // ── 5. Email digests ──────────────────────────────────────────────────
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
    const d = digests.get(u.id) ?? emptyDigest();
    const sections: { heading: string; lines: string[]; href: string }[] = [];
    if (d.mySessions.length) sections.push({ heading: "Your upcoming sessions", lines: d.mySessions.map((m) => m.label), href: d.mySessions[0].href });
    if (d.overdueTasks.length) sections.push({ heading: "Overdue tasks", lines: d.overdueTasks.map((t) => `${t.title} (was due ${fmtDate(t.due)})`), href: "/tasks" });
    if (d.dueTasks.length) sections.push({ heading: "Due in the next 2 days", lines: d.dueTasks.map((t) => `${t.title} (due ${fmtDate(t.due)})`), href: "/tasks" });
    if (d.assignments.length) sections.push({ heading: "Training assignments due", lines: d.assignments.map((a) => `${a.title} — due ${fmtDate(a.due)}`), href: d.assignments[0].href });
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
