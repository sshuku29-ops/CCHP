"use client";

import { ActionForm } from "@/components/shared/action-form";
import { FieldError } from "@/components/shared/field-error";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPersonalTask } from "@/lib/projects/actions";

/**
 * Small "New task" form for volunteers on /tasks. Creates a personal task that
 * only the volunteer (and admins) can see. Resets after a successful save.
 */
export function PersonalTaskForm() {
  return (
    <ActionForm action={createPersonalTask} className="space-y-3" resetOnSuccess>
      {(state) => (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="pt-title">Title</Label>
            <Input id="pt-title" name="title" required maxLength={200} placeholder="e.g. Draft slides for the nutrition session" />
            <FieldError msg={state?.fieldErrors?.title} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pt-description">Description (optional)</Label>
            <Textarea id="pt-description" name="description" rows={3} placeholder="Notes to yourself. Markdown is fine." />
            <FieldError msg={state?.fieldErrors?.description} />
          </div>
          <div className="space-y-1.5 sm:max-w-xs">
            <Label htmlFor="pt-dueDate">Due date (optional)</Label>
            <Input id="pt-dueDate" name="dueDate" type="date" />
            <FieldError msg={state?.fieldErrors?.dueDate} />
          </div>
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <SubmitButton size="sm">Add to my tasks</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
