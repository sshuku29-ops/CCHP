"use client";

import { ActionForm } from "@/components/shared/action-form";
import { FieldError } from "@/components/shared/field-error";
import { NativeSelect } from "@/components/shared/native-select";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TASK_PRIORITIES, TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";
import { createTask, updateTask } from "@/lib/projects/actions";
import type { UserOption } from "@/lib/projects/queries";

export type TaskFormValues = {
  id: string;
  title: string;
  description: string | null;
  projectId: string | null;
  status: string;
  priority: string;
  needsOwner: boolean;
  startDate: Date | null;
  dueDate: Date | null;
  assigneeIds: string[];
};

const PRIORITY_LABELS: Record<string, string> = { LOW: "Low", NORMAL: "Normal", HIGH: "High" };

/** Full task form for admins (create at /tasks/new, edit on /tasks/[id]). */
export function TaskForm({
  task,
  projects,
  users,
  defaultProjectId,
}: {
  task?: TaskFormValues;
  projects: { id: string; title: string; status: string }[];
  users: UserOption[];
  defaultProjectId?: string;
}) {
  const action = task ? updateTask.bind(null, task.id) : createTask;
  const assigned = new Set(task?.assigneeIds ?? []);
  return (
    <ActionForm action={action} className="space-y-4" successMessage="Saved.">
      {(state) => (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={task?.title ?? ""} required maxLength={200} />
            <FieldError msg={state?.fieldErrors?.title} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={4} defaultValue={task?.description ?? ""} placeholder="What needs to happen? Markdown is fine." />
            <FieldError msg={state?.fieldErrors?.description} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="projectId">Project</Label>
              <NativeSelect id="projectId" name="projectId" defaultValue={task?.projectId ?? defaultProjectId ?? ""}>
                <option value="">— No project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                    {p.status !== "ACTIVE" ? ` (${p.status.toLowerCase().replace("_", " ")})` : ""}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <NativeSelect id="status" name="status" defaultValue={task?.status ?? "TODO"}>
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TASK_STATUS_LABELS[s]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" name="startDate" type="date" defaultValue={toDateInput(task?.startDate)} />
              <FieldError msg={state?.fieldErrors?.startDate} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" name="dueDate" type="date" defaultValue={toDateInput(task?.dueDate)} />
              <FieldError msg={state?.fieldErrors?.dueDate} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority</Label>
              <NativeSelect id="priority" name="priority" defaultValue={task?.priority ?? "NORMAL"}>
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="needsOwner" defaultChecked={task?.needsOwner ?? false} className="size-4 rounded border-input accent-primary" />
                Leave unclaimed so anyone can pick it up
                <span className="text-xs text-muted-foreground">(ignored once someone is assigned)</span>
              </label>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Assignees</legend>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active users.</p>
            ) : (
              <div className="grid max-h-56 grid-cols-1 gap-x-4 gap-y-1 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-3">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="assigneeIds" value={u.id} defaultChecked={assigned.has(u.id)} className="size-4 rounded border-input accent-primary" />
                    <span className="truncate">
                      {u.firstName} {u.lastName}
                    </span>
                    {u.role !== "VOLUNTEER" ? <span className="text-xs text-muted-foreground">leader</span> : null}
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Newly assigned people get an in-app notification.</p>
          </fieldset>

          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <SubmitButton>{task ? "Save task" : "Create task"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
