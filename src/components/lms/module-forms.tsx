"use client";

import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { Input } from "@/components/ui/input";
import { toDateInput } from "@/lib/dates";
import { renderMarkdown } from "@/lib/markdown";
import { addModule, updateModule } from "@/lib/lms/actions";
import { Field } from "./field";

/**
 * Older modules stored Markdown instructions. The editor wants HTML, so we
 * convert legacy Markdown once when the form opens (renderMarkdown is a pure
 * function, safe to run in the browser). New saves are always HTML.
 */
function editorValue(stored: string | null | undefined) {
  if (!stored) return "";
  const isHtml = /^\s*<(p|h\d|ul|ol|div|blockquote|table|pre)[\s>]/i.test(stored);
  return isHtml ? stored : renderMarkdown(stored);
}

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
          <Field id="mod-instructions" label="Instructions (optional — you can also add them later)" error={state?.fieldErrors?.instructions}>
            <RichTextEditor name="instructions" minHeight={160} placeholder="What volunteers should do in this module…" />
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

/** Edit title / summary / instructions (rich text) / due date (module "Manage" tab). */
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
          <Field id="edit-instructions" label="Instructions" help="Use the toolbar for headings, lists, bold and links." error={state?.fieldErrors?.instructions}>
            <RichTextEditor name="instructions" defaultValue={editorValue(module.instructions)} minHeight={280} />
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
