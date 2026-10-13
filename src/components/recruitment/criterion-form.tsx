"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { addCriterionAction, updateCriterionAction } from "@/lib/recruitment/actions";
import type { FormResult } from "@/lib/recruitment/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";

type Existing = { id: string; name: string; description: string | null; maxScore: number };

/** Add (no `criterion`) or edit (with `criterion`) one rubric criterion. */
export function CriterionForm({ cycleId, criterion }: { cycleId: string; criterion?: Existing }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(criterion ? updateCriterionAction : addCriterionAction, null);
  const v = state?.values ?? {};
  const err = state?.fieldErrors ?? {};
  useEffect(() => {
    if (state?.ok) toast.success(state.message ?? "Saved.");
    else if (state?.error) toast.error(state.error);
  }, [state]);
  const ids = criterion ? `edit-${criterion.id}` : "new";

  return (
    <form action={action} className="space-y-3" key={state?.ok ? "saved" : "editing"}>
      <input type="hidden" name="cycleId" value={cycleId} />
      {criterion ? <input type="hidden" name="id" value={criterion.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
        <div className="space-y-1.5">
          <Label htmlFor={`${ids}-name`}>Criterion</Label>
          <Input id={`${ids}-name`} name="name" required defaultValue={v.name ?? criterion?.name ?? ""} placeholder="e.g. Motivation" aria-invalid={!!err.name} />
          <FieldError msg={err.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${ids}-max`}>Max score</Label>
          <Input id={`${ids}-max`} name="maxScore" type="number" min={1} max={10} required defaultValue={v.maxScore ?? criterion?.maxScore ?? 5} aria-invalid={!!err.maxScore} />
          <FieldError msg={err.maxScore} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${ids}-desc`}>What reviewers should look for (optional)</Label>
        <Input id={`${ids}-desc`} name="description" defaultValue={v.description ?? criterion?.description ?? ""} placeholder="e.g. Genuine interest in the mission" />
        <FieldError msg={err.description} />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : criterion ? "Save changes" : "Add criterion"}
        </Button>
        {criterion ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/recruitment/${cycleId}/rubric`}>Cancel</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
