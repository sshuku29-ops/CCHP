"use client";

import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { NativeSelect } from "@/components/shared/native-select";
import { Textarea } from "@/components/ui/textarea";
import { reviewSubmission } from "@/lib/lms/actions";
import { Field } from "./field";

/** Admin review of one submission: status + feedback. Notifies the volunteer on save. */
export function ReviewForm({ submission }: { submission: { id: string; status: string; feedback: string | null } }) {
  const p = `rev-${submission.id}-`;
  return (
    <ActionForm action={reviewSubmission} className="space-y-3">
      {(state) => (
        <>
          <input type="hidden" name="submissionId" value={submission.id} />
          <Field id={`${p}status`} label="Status" error={state?.fieldErrors?.status}>
            <NativeSelect id={`${p}status`} name="status" defaultValue={submission.status === "SUBMITTED" ? "REVIEWED" : submission.status} className="max-w-xs">
              <option value="REVIEWED">Reviewed — looks good</option>
              <option value="NEEDS_REVISION">Needs revision</option>
            </NativeSelect>
          </Field>
          <Field id={`${p}feedback`} label="Feedback for the volunteer" error={state?.fieldErrors?.feedback}>
            <Textarea id={`${p}feedback`} name="feedback" rows={4} defaultValue={submission.feedback ?? ""} />
          </Field>
          <SubmitButton size="sm">Save review</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
