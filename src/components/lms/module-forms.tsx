"use client";

import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toDateInput } from "@/lib/dates";
import { addModule, updateModule } from "@/lib/lms/actions";
import { Field } from "./field";

/** Add a module to a course (shown in the course "Manage" tab). */
export function ModuleAddForm({ courseId }: { courseId: string }) {
  return (
    <ActionForm action={addModule} className="space-y-4" resetOnSuccess>
      {(state) => (
        <>
          <input type="hidden" name="courseId" value={courseId} />
          <Field id="mod-title" label="Module title" error={state?.fieldErrors?.title}>
            <Input id="mod-title" name="title" required maxLength={200} placeholder="Week 1 — Research & topic outline" />
          </Field>
          <Field id="mod-summary" label="One-line summary" error={state?.fieldErrors?.summary}>
            <Input id="mod-summary" name="summary" maxLength={500} />
          </Field>
          <Field id="mod-due" label="Due date (optional)" error={state?.fieldErrors?.dueDate}>
            <Input id="mod-due" name="dueDate" type="date" className="max-w-xs" />
          </Field>
          <SubmitButton>Add module</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

type ModuleLike = { id: string; title: string; summary: string | null; instructions: string | null; dueDate: Date | null };

/** Edit title / summary / markdown instructions / due date (module "Manage" tab). */
export function ModuleEditForm({ module }: { module: ModuleLike }) {
  return (
    <ActionForm action={updateModule} className="space-y-4">
      {(state) => (
        <>
          <input type="hidden" name="moduleId" value={module.id} />
          <Field id="edit-title" label="Title" error={state?.fieldErrors?.title}>
            <Input id="edit-title" name="title" defaultValue={module.title} required maxLength={200} />
          </Field>
          <Field id="edit-summary" label="One-line summary" error={state?.fieldErrors?.summary}>
            <Input id="edit-summary" name="summary" defaultValue={module.summary ?? ""} maxLength={500} />
          </Field>
          <Field
            id="edit-instructions"
            label="Instructions (markdown)"
            help="Supports headings (#), lists (- or 1.), **bold**, links and blockquotes."
            error={state?.fieldErrors?.instructions}
          >
            <Textarea id="edit-instructions" name="instructions" rows={10} defaultValue={module.instructions ?? ""} className="font-mono text-xs" />
          </Field>
          <Field id="edit-due" label="Due date" error={state?.fieldErrors?.dueDate}>
            <Input id="edit-due" name="dueDate" type="date" defaultValue={toDateInput(module.dueDate)} className="max-w-xs" />
          </Field>
          <SubmitButton>Save module</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
