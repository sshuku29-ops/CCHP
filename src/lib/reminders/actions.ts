"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { actionUser, actionMainAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { runReminders } from "./run";

/**
 * Notification actions. Every query is filtered by the signed-in user's id so
 * nobody can read or change somebody else's notifications.
 */

export async function markRead(id: string) {
  const user = await actionUser();
  await db.notification.updateMany({ where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/notifications");
  revalidatePath("/", "layout"); // refresh the unread badge in the sidebar
}

export async function markAllRead() {
  const user = await actionUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

/** Clicking a notification: mark it read, then go where it points. */
export async function openNotification(id: string) {
  const user = await actionUser();
  const n = await db.notification.findFirst({ where: { id, userId: user.id }, select: { href: true } });
  await markRead(id);
  // Only follow links inside this app.
  const href = n?.href && n.href.startsWith("/") && !n.href.startsWith("//") ? n.href : "/notifications";
  redirect(href);
}

/** Main Admin only: run the daily reminder job right now and show the counts. */
export async function runRemindersNowAction() {
  const user = await actionMainAdmin();
  const counts = await runReminders();
  await audit(user.id, "reminders.run", undefined, counts);
  revalidatePath("/notifications");
  const q = new URLSearchParams({
    ran: "1",
    taskDue: String(counts.taskDue),
    taskOverdue: String(counts.taskOverdue),
    waitingOn: String(counts.waitingOn),
    emails: String(counts.emails),
  });
  redirect(`/notifications?${q.toString()}`);
}
