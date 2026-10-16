"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { saveReviewAction } from "@/lib/recruitment/actions";
import type { FormResult } from "@/lib/recruitment/helpers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/shared/field-error";

type Criterion = { id: string; name: string; description: string | null; maxScore: number };

/**
 * One radio row per rubric criterion (1..maxScore) plus a private note.
 * `myScores` is the reviewer's own saved scores; other reviewers' scores are
 * never shown here so each review stays independent.
 */
export function ScoreForm({
  applicationId,
  criteria,
  myScores,
  myNote,
}: {
  applicationId: string;
  criteria: Criterion[];
  myScores: Record<string, number>;
  myNote: string;
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(saveReviewAction, null);
  const v = state?.values ?? {};

  useEffect(() => {
    if (state?.ok) toast.success(state.message ?? "Saved.");
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="applicationId" value={applicationId} />
      {criteria.length === 0 ? (
        <p className="text-sm text-muted-foreground">This cycle has no rubric criteria yet. Add some on the Rubric tab.</p>
      ) : null}
      {criteria.map((c) => {
        const name = `score_${c.id}`;
        const current = v[name] !== undefined ? Number(v[name]) : myScores[c.id];
        return (
          <fieldset key={c.id} className="space-y-2">
            <legend className="text-sm font-medium">
              {c.name} <span className="font-normal text-muted-foreground">(1–{c.maxScore})</span>
            </legend>
            {c.description ? <p className="text-xs text-muted-foreground">{c.description}</p> : null}
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={c.name}>
              {Array.from({ length: c.maxScore }, (_, i) => i + 1).map((n) => (
                <label
                  key={n}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-lg border text-sm tabular-nums transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground hover:bg-muted"
                >
                  <input type="radio" name={name} value={n} defaultChecked={current === n} className="sr-only" />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
      <div className="space-y-1.5">
        <Label htmlFor="note">Private note (only you can see this)</Label>
        <Textarea id="note" name="note" rows={4} maxLength={4000} defaultValue={v.note ?? myNote} placeholder="Anything you want to remember for the decision meeting." />
        <FieldError msg={state?.fieldErrors?.note} />
      </div>
      <Button type="submit" disabled={pending || criteria.length === 0}>
        {pending ? "Saving…" : "Save scores"}
      </Button>
    </form>
  );
}
