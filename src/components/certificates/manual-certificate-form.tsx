"use client";

import { ActionForm } from "@/components/shared/action-form";
import { FieldError } from "@/components/shared/field-error";
import { NativeSelect } from "@/components/shared/native-select";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createManualCertificate } from "@/lib/certificates/actions";

type UserOption = { id: string; firstName: string; lastName: string; role: string };

/** Issue a certificate by hand: pick anyone, a term, and type the hours/sessions. */
export function ManualCertificateForm({ users, terms, defaultTerm }: { users: UserOption[]; terms: string[]; defaultTerm: string }) {
  return (
    <ActionForm action={createManualCertificate} className="space-y-4" resetOnSuccess>
      {(state) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mc-user">Volunteer</Label>
              <NativeSelect id="mc-user" name="userId" defaultValue="" required>
                <option value="">— pick a person —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.lastName}, {u.firstName}
                    {u.role !== "VOLUNTEER" ? " (leader)" : ""}
                  </option>
                ))}
              </NativeSelect>
              <FieldError msg={state?.fieldErrors?.userId} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mc-term">Term</Label>
              <NativeSelect id="mc-term" name="term" defaultValue={defaultTerm}>
                {terms.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </NativeSelect>
              <FieldError msg={state?.fieldErrors?.term} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mc-hours">Hours</Label>
              <Input id="mc-hours" name="hours" type="number" min={0.25} max={2000} step={0.25} required placeholder="12" />
              <FieldError msg={state?.fieldErrors?.hours} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mc-sessions">Sessions</Label>
              <Input id="mc-sessions" name="sessionsCount" type="number" min={0} max={1000} step={1} defaultValue="0" />
              <FieldError msg={state?.fieldErrors?.sessionsCount} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mc-notes">Notes (optional, internal)</Label>
            <Textarea id="mc-notes" name="notes" rows={2} maxLength={1000} placeholder="Why this was issued by hand, e.g. hours from the old spreadsheet." />
            <FieldError msg={state?.fieldErrors?.notes} />
          </div>
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <SubmitButton pendingText="Building PDF…">Issue certificate</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
