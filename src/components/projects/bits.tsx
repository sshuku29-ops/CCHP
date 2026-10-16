// Small presentational pieces reused across goals, projects, tasks and the dashboard.
// These are plain components (no client JS) so they work in server components.

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
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

export type AssigneeUser = { firstName: string; lastName: string; photoKey?: string | null };

/** Small avatar + name for one person. */
export function AssigneeChip({ user, full = false }: { user: AssigneeUser; full?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <UserAvatar user={user} size="xs" />
      <span>{full ? `${user.firstName} ${user.lastName}` : `${user.firstName} ${user.lastName.charAt(0)}.`}</span>
    </span>
  );
}

/** Assignees as small avatars with names, or a "needs owner" badge. */
export function Assignees({
  task,
  full = false,
}: {
  task: { needsOwner: boolean; assignees: { user: AssigneeUser }[] };
  /** Show full last names (task detail page). */
  full?: boolean;
}) {
  if (task.assignees.length === 0) {
    return task.needsOwner ? <NeedsOwnerBadge /> : <span className="text-muted-foreground">Unassigned</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {task.assignees.map((a, i) => (
        <AssigneeChip key={`${a.user.firstName}-${a.user.lastName}-${i}`} user={a.user} full={full} />
      ))}
    </span>
  );
}

export function NeedsOwnerBadge() {
  return (
    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100">
      Needs owner
    </Badge>
  );
}

/** Marks a private task someone created for themselves (admins see these with this badge). */
export function PersonalBadge() {
  return (
    <Badge variant="outline" className="border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-100">
      Personal
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
