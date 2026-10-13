"use client";

// Kanban board: four columns (one per status). Cards can be dragged between
// columns with native HTML5 drag events; a status <select> on each card is the
// fallback for touch screens. Both call the setTaskStatus server action.

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { TASK_STATUSES, TASK_STATUS_LABELS, type TaskStatus } from "@/lib/constants";
import { setTaskStatus } from "@/lib/projects/actions";
import { isTaskOverdue } from "@/lib/projects/progress";
import type { TaskRow } from "@/lib/projects/queries";
import { fmtDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { ProjectDot, NeedsOwnerBadge } from "./bits";

const COLUMN_STYLES: Record<TaskStatus, string> = {
  TODO: "border-t-slate-400",
  IN_PROGRESS: "border-t-blue-500",
  DONE: "border-t-emerald-500",
  BLOCKED: "border-t-red-500",
};

export function TaskBoard({ tasks: initial, showProject = true }: { tasks: TaskRow[]; showProject?: boolean }) {
  // Optimistic copy: the card moves immediately, then the server re-renders
  // the page with the saved state (or reverts if the action failed).
  const [tasks, applyMove] = useOptimistic(initial, (state: TaskRow[], m: { id: string; status: TaskStatus }) =>
    state.map((t) => (t.id === m.id ? { ...t, status: m.status } : t)),
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [, startTransition] = useTransition();

  function move(taskId: string, status: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    startTransition(async () => {
      applyMove({ id: taskId, status });
      const res = await setTaskStatus(taskId, status);
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {TASK_STATUSES.map((status) => {
        const column = tasks.filter((t) => t.status === status);
        return (
          <section
            key={status}
            aria-label={TASK_STATUS_LABELS[status]}
            onDragOver={(e) => {
              e.preventDefault();
              if (over !== status) setOver(status);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/task-id") || dragging;
              if (id) move(id, status);
              setDragging(null);
              setOver(null);
            }}
            className={cn(
              "flex min-h-40 flex-col rounded-xl border border-t-4 bg-muted/40 p-2 transition-colors",
              COLUMN_STYLES[status],
              over === status && dragging ? "bg-primary/5 ring-2 ring-primary/30" : "",
            )}
          >
            <header className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{TASK_STATUS_LABELS[status]}</h3>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{column.length}</span>
            </header>
            <div className="flex flex-1 flex-col gap-2">
              {column.length === 0 ? (
                <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">Drop a task here</p>
              ) : null}
              {column.map((t) => (
                <BoardCard
                  key={t.id}
                  task={t}
                  showProject={showProject}
                  dragging={dragging === t.id}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/task-id", t.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragging(t.id);
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                  onStatusChange={(s) => move(t.id, s)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function BoardCard({
  task,
  showProject,
  dragging,
  onDragStart,
  onDragEnd,
  onStatusChange,
}: {
  task: TaskRow;
  showProject: boolean;
  dragging: boolean;
  onDragStart: React.DragEventHandler<HTMLDivElement>;
  onDragEnd: () => void;
  onStatusChange: (s: TaskStatus) => void;
}) {
  const overdue = isTaskOverdue(task);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab rounded-lg border bg-card p-2.5 text-sm shadow-xs active:cursor-grabbing",
        dragging && "opacity-50",
      )}
    >
      <Link href={`/tasks/${task.id}`} className="font-medium leading-snug hover:underline">
        {task.title}
      </Link>
      {showProject && task.project ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ProjectDot color={task.project.color} />
          <span className="truncate">{task.project.title}</span>
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {task.assignees.length > 0 ? (
          <span className="truncate">{task.assignees.map((a) => `${a.user.firstName} ${a.user.lastName.charAt(0)}.`).join(", ")}</span>
        ) : task.needsOwner ? (
          <NeedsOwnerBadge />
        ) : (
          <span>Unassigned</span>
        )}
        {task.priority === "HIGH" ? <span className="font-medium text-red-600 dark:text-red-400">High</span> : null}
        {task.dueDate ? (
          <span className={cn("ml-auto tabular-nums", overdue && "font-medium text-red-600 dark:text-red-400")}>{fmtDate(task.dueDate, "MMM d")}</span>
        ) : null}
      </div>
      {/* Touch / keyboard fallback for drag-and-drop */}
      <label className="mt-2 block">
        <span className="sr-only">Status</span>
        <select
          value={task.status}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
          className="h-7 w-full rounded-md border border-input bg-background px-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TASK_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
