"use client";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect } from "@/components/shared/native-select";
import { SubmitButton } from "@/components/shared/submit-button";
import { Label } from "@/components/ui/label";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/constants";
import { updateTask } from "@/lib/projects/actions";

/** Volunteers can only change the status of a task assigned to them. */
export function TaskStatusForm({ taskId, status }: { taskId: string; status: string }) {
  return (
    <ActionForm action={updateTask.bind(null, taskId)} className="flex flex-wrap items-end gap-2" successMessage="Status updated.">
      {(state) => (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="status">Update status</Label>
            <NativeSelect id="status" name="status" defaultValue={status} className="w-44">
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_LABELS[s]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <SubmitButton size="sm" className="h-8">
            Save
          </SubmitButton>
          {state?.error ? <p className="w-full text-sm text-destructive">{state.error}</p> : null}
        </>
      )}
    </ActionForm>
  );
}
