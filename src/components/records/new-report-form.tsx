"use client";

import { ActionForm } from "@/components/shared/action-form";
import { FieldError } from "@/components/shared/field-error";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createReportAction } from "@/lib/reports/actions";

/** "New report": pick the academic year (the year it STARTS in, e.g. 2025 = Aug 2025–Jul 2026). */
export function NewReportForm({ defaultYear }: { defaultYear: number }) {
  return (
    <ActionForm action={createReportAction} className="flex flex-wrap items-end gap-3">
      {(state) => (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="year">Academic year starting</Label>
            <Input id="year" name="year" type="number" min={2000} max={2100} defaultValue={defaultYear} className="w-32" required />
            <FieldError msg={state?.fieldErrors?.year} />
          </div>
          <SubmitButton pendingText="Creating…">New report</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
