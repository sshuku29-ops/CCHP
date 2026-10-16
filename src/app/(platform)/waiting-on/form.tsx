"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createWaitingOnAction, updateWaitingOnAction } from "@/lib/outreach/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/native-select";
import { FieldError } from "@/components/shared/field-error";
import { WAITING_CHANNELS } from "@/lib/constants";

/** Values pre-filled when editing. Dates are passed as "YYYY-MM-DD" strings. */
export type WaitingOnFormValues = {
  id?: string;
  contactName: string;
  organization: string;
  whatSent: string;
  channel: string;
  sentAt: string;
  remindAfterDays: number;
  ownerId: string;
  notes: string;
};

export function WaitingOnForm({
  initial,
  admins,
}: {
  initial?: WaitingOnFormValues;
  admins: { id: string; firstName: string; lastName: string }[];
}) {
  // Edit mode binds the id as the first argument of the update action.
  const action = initial?.id ? updateWaitingOnAction.bind(null, initial.id) : createWaitingOnAction;
  const [state, formAction, pending] = useActionState(action, null);
  const v = initial;

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="contactName">Contact</Label>
        <Input id="contactName" name="contactName" defaultValue={v?.contactName} required maxLength={120} />
        <FieldError msg={state?.fieldErrors?.contactName} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="organization">Organization</Label>
        <Input id="organization" name="organization" defaultValue={v?.organization} maxLength={120} />
        <FieldError msg={state?.fieldErrors?.organization} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="whatSent">What was sent</Label>
        <Input id="whatSent" name="whatSent" defaultValue={v?.whatSent} required maxLength={500} placeholder="e.g. Partnership proposal email" />
        <FieldError msg={state?.fieldErrors?.whatSent} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="channel">Channel</Label>
        <NativeSelect id="channel" name="channel" defaultValue={v?.channel ?? ""}>
          <option value="">—</option>
          {WAITING_CHANNELS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </NativeSelect>
        <FieldError msg={state?.fieldErrors?.channel} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sentAt">Sent on</Label>
        <Input id="sentAt" name="sentAt" type="date" defaultValue={v?.sentAt} required />
        <FieldError msg={state?.fieldErrors?.sentAt} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="remindAfterDays">Remind after (days)</Label>
        <Input id="remindAfterDays" name="remindAfterDays" type="number" min={1} max={365} defaultValue={v?.remindAfterDays ?? 7} required />
        <FieldError msg={state?.fieldErrors?.remindAfterDays} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ownerId">Owner</Label>
        <NativeSelect id="ownerId" name="ownerId" defaultValue={v?.ownerId ?? ""}>
          <option value="">Unassigned</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
          ))}
        </NativeSelect>
        <FieldError msg={state?.fieldErrors?.ownerId} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={v?.notes} rows={3} maxLength={2000} />
        <FieldError msg={state?.fieldErrors?.notes} />
      </div>
      {state?.error ? <p className="text-sm text-destructive sm:col-span-2">{state.error}</p> : null}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : v?.id ? "Save changes" : "Add item"}</Button>
        <Button variant="outline" asChild><Link href="/waiting-on">Cancel</Link></Button>
      </div>
    </form>
  );
}
