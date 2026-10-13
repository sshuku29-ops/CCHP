"use client";

import { ActionForm } from "@/components/shared/action-form";
import { FieldError } from "@/components/shared/field-error";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { quickAddTask } from "@/lib/projects/actions";

/** One-line "add a task" form on the project page. Title + optional due date. */
export function QuickAddTask({ projectId }: { projectId: string }) {
  return (
    <ActionForm action={quickAddTask.bind(null, projectId)} resetOnSuccess successMessage="Task added.">
      {(state) => (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex-1">
            <Input name="title" placeholder="Add a task… (it starts as “needs owner”)" aria-label="Task title" required maxLength={200} />
            <FieldError msg={state?.fieldErrors?.title} />
          </div>
          <div>
            <Input name="dueDate" type="date" aria-label="Due date" className="sm:w-40" />
            <FieldError msg={state?.fieldErrors?.dueDate} />
          </div>
          <SubmitButton size="sm" className="h-8" pendingText="Adding…">
            Add task
          </SubmitButton>
        </div>
      )}
    </ActionForm>
  );
}
