// Progress math shared by the dashboard, goal list, project list and task views.
// Keep every "how many tasks are done" calculation here so the numbers always
// agree across pages.

import { TASK_STATUSES, type TaskStatus } from "@/lib/constants";

export type ProgressSummary = {
  total: number;
  done: number;
  /** 0–100, rounded. 0 when there are no tasks. */
  pct: number;
  byStatus: Record<TaskStatus, number>;
};

/** Count tasks per status and compute a done percentage. */
export function summarizeTasks(tasks: { status: string }[]): ProgressSummary {
  const byStatus = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0])) as Record<TaskStatus, number>;
  for (const t of tasks) {
    if (t.status in byStatus) byStatus[t.status as TaskStatus] += 1;
  }
  const total = tasks.length;
  const done = byStatus.DONE;
  return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100), byStatus };
}

/** Roll several project summaries up into one (used for goals). */
export function mergeSummaries(parts: ProgressSummary[]): ProgressSummary {
  const byStatus = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0])) as Record<TaskStatus, number>;
  let total = 0;
  let done = 0;
  for (const p of parts) {
    total += p.total;
    done += p.done;
    for (const s of TASK_STATUSES) byStatus[s] += p.byStatus[s];
  }
  return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100), byStatus };
}

/** Midnight UTC of today — due dates are stored at UTC midnight so compare against this. */
export function todayUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** A task is overdue when its due date is before today and it is not done. */
export function isTaskOverdue(task: { dueDate: Date | null; status: string }, now = new Date()): boolean {
  if (!task.dueDate || task.status === "DONE") return false;
  return task.dueDate.getTime() < todayUtc(now).getTime();
}

/** Due today or within the next 7 days (and not done). */
export function isDueThisWeek(task: { dueDate: Date | null; status: string }, now = new Date()): boolean {
  if (!task.dueDate || task.status === "DONE") return false;
  const start = todayUtc(now).getTime();
  const end = start + 7 * 86_400_000;
  return task.dueDate.getTime() >= start && task.dueDate.getTime() < end;
}

/**
 * First day of the current academic term (local time), matching termForDate():
 * Fall starts Aug 1, Spring Jan 1, Summer Jun 1.
 */
export function termStartDate(now = new Date()): Date {
  const m = now.getMonth();
  const y = now.getFullYear();
  if (m >= 7) return new Date(y, 7, 1);
  if (m <= 4) return new Date(y, 0, 1);
  return new Date(y, 5, 1);
}

/**
 * Buckets for "tasks completed per week" charts: the last `weeks` weeks,
 * oldest first, each starting on a Monday.
 */
export function weekBuckets(weeks = 8, now = new Date()): { start: Date; end: Date; label: string }[] {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  // Back up to Monday of the current week.
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  const out: { start: Date; end: Date; label: string }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(d);
    start.setDate(d.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    out.push({ start, end, label: `${start.getMonth() + 1}/${start.getDate()}` });
  }
  return out;
}

export function countCompletedPerWeek(tasks: { completedAt: Date | null }[], weeks = 8, now = new Date()) {
  const buckets = weekBuckets(weeks, now);
  return buckets.map((b) => ({
    week: b.label,
    completed: tasks.filter((t) => t.completedAt && t.completedAt >= b.start && t.completedAt < b.end).length,
  }));
}

/** Sort helper: soonest due first, tasks without a due date last. */
export function byDueDate<T extends { dueDate: Date | null }>(a: T, b: T) {
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate.getTime() - b.dueDate.getTime();
}
