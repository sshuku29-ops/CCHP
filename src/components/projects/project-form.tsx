"use client";

import { ActionForm } from "@/components/shared/action-form";
import { FieldError } from "@/components/shared/field-error";
import { NativeSelect } from "@/components/shared/native-select";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_STATUSES } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";
import { createProject, updateProject } from "@/lib/projects/actions";
import type { UserOption } from "@/lib/projects/queries";

export type ProjectFormValues = {
  id: string;
  title: string;
  description: string | null;
  goalId: string | null;
  ownerId: string | null;
  status: string;
  startDate: Date | null;
  dueDate: Date | null;
  color: string | null;
};

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Active", ON_HOLD: "On hold", COMPLETED: "Completed", ARCHIVED: "Archived" };

// A few friendly preset colors; the color input still allows any hex.
const PRESET_COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#64748b"];

export function ProjectForm({
  project,
  goals,
  users,
  defaultGoalId,
}: {
  project?: ProjectFormValues;
  goals: { id: string; title: string; term: string; status: string }[];
  users: UserOption[];
  defaultGoalId?: string;
}) {
  const action = project ? updateProject.bind(null, project.id) : createProject;
  // Deterministic default (no Math.random — it would differ between server and client render).
  const defaultColor = project?.color ?? PRESET_COLORS[0];
  return (
    <ActionForm action={action} className="space-y-4" successMessage="Saved.">
      {(state) => (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="title">Project title</Label>
            <Input id="title" name="title" defaultValue={project?.title ?? ""} required maxLength={200} />
            <FieldError msg={state?.fieldErrors?.title} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={project?.description ?? ""} placeholder="What is this project for? What does done look like?" />
            <FieldError msg={state?.fieldErrors?.description} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="goalId">Serves goal</Label>
              <NativeSelect id="goalId" name="goalId" defaultValue={project?.goalId ?? defaultGoalId ?? ""}>
                <option value="">— No goal —</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title} ({g.term}){g.status !== "ACTIVE" ? ` · ${g.status.toLowerCase()}` : ""}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ownerId">Owner</Label>
              <NativeSelect id="ownerId" name="ownerId" defaultValue={project?.ownerId ?? ""}>
                <option value="">— No owner yet —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" name="startDate" type="date" defaultValue={toDateInput(project?.startDate)} />
              <FieldError msg={state?.fieldErrors?.startDate} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" name="dueDate" type="date" defaultValue={toDateInput(project?.dueDate)} />
              <FieldError msg={state?.fieldErrors?.dueDate} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <NativeSelect id="status" name="status" defaultValue={project?.status ?? "ACTIVE"}>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="color">Color</Label>
              <div className="flex items-center gap-2">
                <input id="color" name="color" type="color" list="project-color-presets" defaultValue={defaultColor} className="h-8 w-12 cursor-pointer rounded-md border border-input bg-transparent p-0.5" />
                <datalist id="project-color-presets">
                  {PRESET_COLORS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <span className="text-xs text-muted-foreground">Used as the project dot in lists and on the board.</span>
              </div>
            </div>
          </div>
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <SubmitButton>{project ? "Save project" : "Create project"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
