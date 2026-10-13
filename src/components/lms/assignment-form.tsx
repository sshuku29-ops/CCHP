"use client";

import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SUBMISSION_TYPES } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";
import { addAssignment, updateAssignment } from "@/lib/lms/actions";
import { Field } from "./field";

export const SUBMISSION_TYPE_LABELS: Record<(typeof SUBMISSION_TYPES)[number], string> = {
  TEXT: "Text response",
  FILE: "File upload",
  VIDEO_LINK: "YouTube link (unlisted)",
  ANY: "Any of the above",
};

type AssignmentLike = { id: string; title: string; description: string | null; submissionType: string; dueDate: Date | null };

/** Add an assignment (no `assignment` prop) or edit an existing one. */
export function AssignmentForm({ moduleId, assignment }: { moduleId: string; assignment?: AssignmentLike }) {
  const editing = !!assignment;
  const p = assignment ? `asg-${assignment.id}-` : "asg-new-";
  return (
    <ActionForm action={editing ? updateAssignment : addAssignment} className="space-y-3" resetOnSuccess={!editing}>
      {(state) => (
        <>
          {assignment ? <input type="hidden" name="assignmentId" value={assignment.id} /> : <input type="hidden" name="moduleId" value={moduleId} />}
          <Field id={`${p}title`} label="Title" error={state?.fieldErrors?.title}>
            <Input id={`${p}title`} name="title" defaultValue={assignment?.title ?? ""} required maxLength={200} />
          </Field>
          <Field id={`${p}description`} label="Description" error={state?.fieldErrors?.description}>
            <Textarea id={`${p}description`} name="description" rows={3} defaultValue={assignment?.description ?? ""} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`${p}type`} label="Submission type" error={state?.fieldErrors?.submissionType}>
              <NativeSelect id={`${p}type`} name="submissionType" defaultValue={assignment?.submissionType ?? "ANY"}>
                {SUBMISSION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SUBMISSION_TYPE_LABELS[t]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id={`${p}due`} label="Due date" error={state?.fieldErrors?.dueDate}>
              <Input id={`${p}due`} name="dueDate" type="date" defaultValue={toDateInput(assignment?.dueDate)} />
            </Field>
          </div>
          <SubmitButton size="sm" variant={editing ? "outline" : "default"}>
            {editing ? "Save assignment" : "Add assignment"}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
