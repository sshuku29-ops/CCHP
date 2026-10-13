// Small presentational pieces reused across goals, projects, tasks and the dashboard.
// These are plain components (no client JS) so they work in server components.

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { fmtDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { isTaskOverdue, type ProgressSummary } from "@/lib/projects/progress";

/** Colored dot for a project. Falls back to a neutral grey. */
export function ProjectDot({ color, className }: { color?: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color ?? "#94a3b8" }}
    />
  );
}

/** Project name with its color dot, linking to the project page. */
export function ProjectChip({ project }: { project: { id: string; title: string; color: string | null } | null }) {
  if (!project) return <span className="text-muted-foreground">—</span>;
  return (
    <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1.5 hover:underline">
      <ProjectDot color={project.color} />
      <span className="truncate">{project.title}</span>
    </Link>
  );
}

/** Due date; red when overdue. */
export function DueDate({ task, className }: { task: { dueDate: Date | null; status: string }; className?: string }) {
  if (!task.dueDate) return <span className={cn("text-muted-foreground", className)}>—</span>;
  const overdue = isTaskOverdue(task);
  return (
    <span className={cn(overdue && "font-medium text-red-600 dark:text-red-400", className)} title={overdue ? "Overdue" : undefined}>
      {fmtDate(task.dueDate)}
    </span>
  );
}

/** Comma-separated assignee names, or a "needs owner" badge. */
export function Assignees({
  task,
}: {
  task: { needsOwner: boolean; assignees: { user: { firstName: string; lastName: string } }[] };
}) {
  if (task.assignees.length === 0) {
    return task.needsOwner ? <NeedsOwnerBadge /> : <span className="text-muted-foreground">Unassigned</span>;
  }
  return <span>{task.assignees.map((a) => `${a.user.firstName} ${a.user.lastName.charAt(0)}.`).join(", ")}</span>;
}

export function NeedsOwnerBadge() {
  return (
    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
      Needs owner
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "NORMAL") return <span className="text-xs text-muted-foreground">Normal</span>;
  return <StatusBadge status={priority} />;
}

/** Done / total bar used by goal and project lists. */
export function ProgressBar({ progress, showLabel = true, className }: { progress: ProgressSummary; showLabel?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress.pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress.pct}%` }} />
      </div>
      {showLabel ? (
        <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {progress.done}/{progress.total} · {progress.pct}%
        </span>
      ) : null}
    </div>
  );
}
