"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { updateCycleDatesAction, setCycleOpenAction } from "@/lib/recruitment/actions";
import { type FormResult } from "@/lib/recruitment/helpers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";
import { ActionButton } from "@/components/recruitment/action-button";

type Props = {
  cycleId: string;
  isOpen: boolean;
  opensAt: string; // yyyy-mm-dd or ""
  closesAt: string; // yyyy-mm-dd or ""
};

/**
 * The inline deadline form in the cycle status panel: "Opens on", "Closes
 * on", a "leave open" checkbox that clears the deadline, and the two manual
 * switch buttons. Dates are saved with `updateCycleDatesAction`; the buttons
 * call `setCycleOpenAction` directly.
 */
export function CycleDeadlineForm({ cycleId, isOpen, opensAt, closesAt }: Props) {
  const [state, action, pending] = useActionState<FormResult, FormData>(updateCycleDatesAction, null);
  const v = state?.values ?? {};
  const err = state?.fieldErrors ?? {};
  // Ticked = no deadline. Starts ticked when the cycle has no closing date.
  const [noDeadline, setNoDeadline] = useState(closesAt === "");

  useEffect(() => {
    if (state?.ok) toast.success(state.message ?? "Saved.");
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="cycleId" value={cycleId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="opensAt">Opens on (optional)</Label>
            <Input id="opensAt" name="opensAt" type="date" defaultValue={v.opensAt ?? opensAt} aria-invalid={!!err.opensAt} />
            <FieldError msg={err.opensAt} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="closesAt">Closes on (optional, inclusive)</Label>
            {/* When "leave open" is ticked the date input is disabled (so it is not submitted)
                and the hidden field sends an empty closesAt, which clears the deadline. */}
            {noDeadline ? <input type="hidden" name="closesAt" value="" /> : null}
            <Input
              id="closesAt"
              name="closesAt"
              type="date"
              disabled={noDeadline}
              defaultValue={v.closesAt ?? closesAt}
              aria-invalid={!!err.closesAt}
            />
            <FieldError msg={err.closesAt} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={noDeadline} onCheckedChange={(c) => setNoDeadline(c === true)} />
            Leave open until I close it manually
          </label>
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>
            {pending ? "Saving…" : "Save dates"}
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <ActionButton size="sm" variant={isOpen ? "outline" : "default"} disabled={isOpen} action={setCycleOpenAction.bind(null, cycleId, true)}>
          Open applications now
        </ActionButton>
        <ActionButton size="sm" variant={isOpen ? "default" : "outline"} disabled={!isOpen} action={setCycleOpenAction.bind(null, cycleId, false)}>
          Close applications now
        </ActionButton>
        <span className="text-xs text-muted-foreground">
          Manual switch: <strong>{isOpen ? "ON" : "OFF"}</strong>
        </span>
      </div>
    </div>
  );
}
