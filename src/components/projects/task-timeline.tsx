"use client";

// Timeline / Gantt view. Each task with a due date becomes a horizontal bar
// from its start date (or creation date) to its due date on a week-scaled axis.
// Tasks without a due date are listed underneath so nothing is hidden.

import Link from "next/link";
import { fmtDate } from "@/lib/dates";
import { isTaskOverdue, todayUtc } from "@/lib/projects/progress";
import type { TaskRow } from "@/lib/projects/queries";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ProjectDot } from "./bits";

const DAY = 86_400_000;
const WEEK_PX = 96; // width of one week column

/** UTC midnight for any date. */
function floorDay(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
/** Back up to the Monday (UTC) on or before the given day. */
function floorMonday(ms: number) {
  const d = new Date(ms);
  const dow = (d.getUTCDay() + 6) % 7;
  return ms - dow * DAY;
}

function assigneeNames(t: TaskRow) {
  return t.assignees.map((a) => `${a.user.firstName} ${a.user.lastName.charAt(0)}.`).join(", ");
}

export function TaskTimeline({ tasks, showProject = true }: { tasks: TaskRow[]; showProject?: boolean }) {
  const today = todayUtc().getTime();
  const dated = tasks
    .filter((t) => t.dueDate)
    .map((t) => {
      const end = floorDay(t.dueDate as Date);
      let start = floorDay(t.startDate ?? t.createdAt);
      if (start > end) start = end;
      return { task: t, start, end };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const undated = tasks.filter((t) => !t.dueDate);

  if (dated.length === 0 && undated.length === 0) {
    return <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No tasks to show.</p>;
  }

  // Axis: from the Monday before the earliest start (or today) to the Monday
  // after the latest due date (or today), at least two weeks wide.
  const minStart = Math.min(today, ...dated.map((d) => d.start));
  const maxEnd = Math.max(today, ...dated.map((d) => d.end));
  const rangeStart = floorMonday(minStart) - 7 * DAY;
  let rangeEnd = floorMonday(maxEnd) + 14 * DAY;
  if (rangeEnd - rangeStart < 3 * 7 * DAY) rangeEnd = rangeStart + 3 * 7 * DAY;
  const weeks: number[] = [];
  for (let w = rangeStart; w < rangeEnd; w += 7 * DAY) weeks.push(w);
  const totalPx = weeks.length * WEEK_PX;
  const pxFor = (ms: number) => ((ms - rangeStart) / (rangeEnd - rangeStart)) * totalPx;

  return (
    <div className="space-y-4">
      {dated.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <div className="flex" style={{ minWidth: 220 + totalPx }}>
            {/* Left column: task labels */}
            <div className="sticky left-0 z-10 w-[220px] shrink-0 border-r bg-card">
              <div className="flex h-9 items-end border-b px-3 pb-1.5 text-xs font-medium text-muted-foreground">Task · owner</div>
              {dated.map(({ task }) => (
                <div key={task.id} className="flex h-11 flex-col justify-center border-b px-3 last:border-b-0">
                  <Link href={`/tasks/${task.id}`} className="truncate text-sm font-medium hover:underline">
                    {task.title}
                  </Link>
                  <span className="truncate text-xs text-muted-foreground">
                    {task.assignees.length > 0 ? assigneeNames(task) : task.needsOwner ? "Needs owner" : "Unassigned"}
                  </span>
                </div>
              ))}
            </div>
            {/* Right: week axis + bars */}
            <div className="relative" style={{ width: totalPx }}>
              <div className="flex h-9 border-b">
                {weeks.map((w) => (
                  <div key={w} className="shrink-0 border-r px-1.5 pt-1.5 text-xs text-muted-foreground last:border-r-0" style={{ width: WEEK_PX }}>
                    {fmtDate(new Date(w), "MMM d")}
                  </div>
                ))}
              </div>
              {/* Week grid lines behind the bars */}
              <div className="pointer-events-none absolute inset-x-0 top-9 bottom-0 flex">
                {weeks.map((w) => (
                  <div key={w} className="shrink-0 border-r border-dashed border-border/60 last:border-r-0" style={{ width: WEEK_PX }} />
                ))}
              </div>
              {/* Today marker */}
              {today >= rangeStart && today <= rangeEnd ? (
                <div className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-red-500" style={{ left: pxFor(today) }}>
                  <span className="absolute -top-0 left-1 rounded bg-red-500 px-1 text-[10px] font-medium text-white">Today</span>
                </div>
              ) : null}
              {dated.map(({ task, start, end }) => {
                const left = pxFor(start);
                const width = Math.max(pxFor(end + DAY) - left, 10);
                const overdue = isTaskOverdue(task);
                const done = task.status === "DONE";
                return (
                  <div key={task.id} className="relative h-11 border-b last:border-b-0">
                    <Link
                      href={`/tasks/${task.id}`}
                      title={`${task.title}: ${fmtDate(new Date(start), "MMM d")} → ${fmtDate(task.dueDate)} · ${TASK_STATUS_LABELS[task.status as TaskStatus]}`}
                      className={cn(
                        "absolute top-2.5 flex h-6 items-center gap-1 overflow-hidden rounded-md px-2 text-xs font-medium text-white shadow-xs transition-opacity hover:opacity-90",
                        done && "opacity-60",
                        overdue && "ring-2 ring-red-500 ring-offset-1 ring-offset-card",
                      )}
                      style={{ left, width, backgroundColor: task.project?.color ?? "#64748b" }}
                    >
                      {showProject && task.project ? <ProjectDot color="white" className="opacity-70" /> : null}
                      <span className="truncate">{task.title}</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No tasks have a due date yet, so there is nothing to draw on the timeline.
        </p>
      )}

      {undated.length > 0 ? (
        <div className="rounded-xl border bg-card p-3">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">No due date ({undated.length})</h3>
          <ul className="divide-y">
            {undated.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-sm">
                {showProject ? <ProjectDot color={t.project?.color} /> : null}
                <Link href={`/tasks/${t.id}`} className="font-medium hover:underline">
                  {t.title}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {t.assignees.length > 0 ? assigneeNames(t) : t.needsOwner ? "Needs owner" : "Unassigned"} · {TASK_STATUS_LABELS[t.status as TaskStatus]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
