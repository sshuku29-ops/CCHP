"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { addQuestionAction, updateQuestionAction } from "@/lib/recruitment/actions";
import { QUESTION_TYPE_LABELS, type FormResult } from "@/lib/recruitment/helpers";
import { QUESTION_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/native-select";
import { FieldError } from "@/components/shared/field-error";

type Existing = { id: string; prompt: string; helpText: string | null; type: string; required: boolean };

/** Add (no `question`) or edit (with `question`) one application question. */
export function QuestionForm({ cycleId, question }: { cycleId: string; question?: Existing }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(question ? updateQuestionAction : addQuestionAction, null);
  const v = state?.values ?? {};
  const err = state?.fieldErrors ?? {};
  useEffect(() => {
    if (state?.ok) toast.success(state.message ?? "Saved.");
    else if (state?.error) toast.error(state.error);
  }, [state]);
  const ids = question ? `edit-${question.id}` : "new";

  return (
    <form action={action} className="space-y-3" key={state?.ok ? "saved" : "editing"}>
      <input type="hidden" name="cycleId" value={cycleId} />
      {question ? <input type="hidden" name="id" value={question.id} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor={`${ids}-prompt`}>Question</Label>
        <Textarea id={`${ids}-prompt`} name="prompt" rows={2} required defaultValue={v.prompt ?? question?.prompt ?? ""} aria-invalid={!!err.prompt} />
        <FieldError msg={err.prompt} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor={`${ids}-type`}>Answer type</Label>
          <NativeSelect id={`${ids}-type`} name="type" defaultValue={v.type ?? question?.type ?? "LONG_TEXT"}>
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {QUESTION_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
          <FieldError msg={err.type} />
        </div>
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input type="checkbox" name="required" className="size-4 accent-primary" defaultChecked={v.required !== undefined ? v.required === "on" : (question?.required ?? true)} />
          Required
        </label>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${ids}-help`}>Help text (optional)</Label>
        <Input id={`${ids}-help`} name="helpText" defaultValue={v.helpText ?? question?.helpText ?? ""} placeholder="e.g. 2–3 sentences is plenty." />
        <FieldError msg={err.helpText} />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : question ? "Save changes" : "Add question"}
        </Button>
        {question ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/recruitment/${cycleId}/questions`}>Cancel</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
