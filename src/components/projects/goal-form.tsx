"use client";

import { ActionForm } from "@/components/shared/action-form";
import { FieldError } from "@/components/shared/field-error";
import { NativeSelect } from "@/components/shared/native-select";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GOAL_STATUSES } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";
import { createGoal, updateGoal } from "@/lib/projects/actions";

export type GoalFormValues = {
  id: string;
  title: string;
  description: string | null;
  term: string;
  status: string;
  targetDate: Date | null;
};

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Active", ACHIEVED: "Achieved", DROPPED: "Archived / dropped" };

/** Create or edit a goal. Pass `goal` to edit. */
export function GoalForm({ goal, terms, defaultTerm }: { goal?: GoalFormValues; terms: string[]; defaultTerm: string }) {
  const action = goal ? updateGoal.bind(null, goal.id) : createGoal;
  return (
    <ActionForm action={action} className="space-y-4" successMessage="Saved.">
      {(state) => (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="title">Goal</Label>
            <Input id="title" name="title" defaultValue={goal?.title ?? ""} required maxLength={200} placeholder="e.g. Run three formal sessions this semester" />
            <FieldError msg={state?.fieldErrors?.title} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">SMART description</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={goal?.description ?? ""}
              placeholder="Specific, Measurable, Achievable, Relevant, Time-bound. What does success look like and by when?"
            />
            <FieldError msg={state?.fieldErrors?.description} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="term">Term</Label>
              <NativeSelect id="term" name="term" defaultValue={goal?.term ?? defaultTerm}>
                {terms.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </NativeSelect>
              <FieldError msg={state?.fieldErrors?.term} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="targetDate">Target date</Label>
              <Input id="targetDate" name="targetDate" type="date" defaultValue={toDateInput(goal?.targetDate)} />
              <FieldError msg={state?.fieldErrors?.targetDate} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <NativeSelect id="status" name="status" defaultValue={goal?.status ?? "ACTIVE"}>
                {GOAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <SubmitButton>{goal ? "Save goal" : "Create goal"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
