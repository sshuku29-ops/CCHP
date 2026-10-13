import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/lib/constants";
import type { TaskRow } from "@/lib/projects/queries";
import { Assignees, DueDate, PriorityBadge, ProjectChip } from "./bits";

/** Compact table of tasks (the "list" view). Server component — no JS needed. */
export function TaskTable({ tasks, showProject = true }: { tasks: TaskRow[]; showProject?: boolean }) {
  if (tasks.length === 0) {
    return <EmptyState title="No tasks match" description="Try clearing a filter, or add a task." />;
  }
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Task</TableHead>
            {showProject ? <TableHead className="hidden md:table-cell">Project</TableHead> : null}
            <TableHead className="hidden sm:table-cell">Assignees</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Priority</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="max-w-[18rem] whitespace-normal font-medium">
                <Link href={`/tasks/${t.id}`} className="hover:underline">
                  {t.title}
                </Link>
                {showProject && t.project ? (
                  <span className="mt-0.5 block text-xs text-muted-foreground md:hidden">{t.project.title}</span>
                ) : null}
              </TableCell>
              {showProject ? (
                <TableCell className="hidden max-w-[14rem] md:table-cell">
                  <ProjectChip project={t.project} />
                </TableCell>
              ) : null}
              <TableCell className="hidden max-w-[14rem] truncate sm:table-cell">
                <Assignees task={t} />
              </TableCell>
              <TableCell>
                <DueDate task={t} />
              </TableCell>
              <TableCell>
                <StatusBadge status={t.status} label={TASK_STATUS_LABELS[t.status as TaskStatus]} />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <PriorityBadge priority={t.priority} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
