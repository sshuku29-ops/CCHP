"use client";

import { createHandoffDocAction, setHandoffOwnerAction } from "@/lib/handoff/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/shared/native-select";
import { FieldError } from "@/components/shared/field-error";
import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";

export type AdminOption = { id: string; firstName: string; lastName: string; leadershipTitle: string | null };

function AdminSelect({ admins, defaultValue, name = "ownerId" }: { admins: AdminOption[]; defaultValue?: string; name?: string }) {
  return (
    <NativeSelect name={name} defaultValue={defaultValue ?? ""}>
      <option value="">No owner yet</option>
      {admins.map((a) => (
        <option key={a.id} value={a.id}>
          {a.firstName} {a.lastName}{a.leadershipTitle ? ` — ${a.leadershipTitle}` : ""}
        </option>
      ))}
    </NativeSelect>
  );
}

/** Main Admin: pick who owns (and may edit) this doc. */
export function HandoffOwnerForm({ docId, ownerId, admins }: { docId: string; ownerId: string | null; admins: AdminOption[] }) {
  const save = setHandoffOwnerAction.bind(null, docId);
  return (
    <ActionForm action={save} className="flex flex-wrap items-end gap-2">
      {() => (
        <>
          <div className="space-y-1.5 min-w-56">
            <Label>Owner</Label>
            <AdminSelect admins={admins} defaultValue={ownerId ?? ""} />
          </div>
          <SubmitButton variant="outline" size="default">Set owner</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

/** Main Admin: start a doc for a role that is not in the seeded list. */
export function HandoffCreateForm({ admins }: { admins: AdminOption[] }) {
  return (
    <ActionForm action={createHandoffDocAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      {(state) => (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="roleTitle">Role title</Label>
            <Input id="roleTitle" name="roleTitle" placeholder="e.g. Outreach Coordinator" required maxLength={80} />
            <FieldError msg={state?.fieldErrors?.roleTitle} />
          </div>
          <div className="space-y-1.5">
            <Label>Owner</Label>
            <AdminSelect admins={admins} />
          </div>
          <SubmitButton>Create doc</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
