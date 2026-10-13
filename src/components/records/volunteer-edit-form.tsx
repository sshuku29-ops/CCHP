"use client";

import { ActionForm } from "@/components/shared/action-form";
import { FieldError } from "@/components/shared/field-error";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateVolunteerAction } from "@/lib/records/actions";
import { toDateInput } from "@/lib/dates";

/**
 * Edits the directory fields only (spec §3). Role / username / password are
 * managed by the Main Admin on the Users page, so they are not here on purpose.
 */
export function VolunteerEditForm({
  volunteer,
}: {
  volunteer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    graduationDate: Date | null;
    hasVehicle: boolean;
  };
}) {
  return (
    <ActionForm action={updateVolunteerAction} successMessage="Saved." className="space-y-4">
      {(state) => (
        <>
          <input type="hidden" name="id" value={volunteer.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" defaultValue={volunteer.firstName} required maxLength={80} />
              <FieldError msg={state?.fieldErrors?.firstName} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" defaultValue={volunteer.lastName} required maxLength={80} />
              <FieldError msg={state?.fieldErrors?.lastName} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={volunteer.email ?? ""} maxLength={200} />
              <FieldError msg={state?.fieldErrors?.email} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={volunteer.phone ?? ""} maxLength={40} />
              <FieldError msg={state?.fieldErrors?.phone} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="graduationDate">Graduation date</Label>
              <Input id="graduationDate" name="graduationDate" type="date" defaultValue={toDateInput(volunteer.graduationDate)} />
              <FieldError msg={state?.fieldErrors?.graduationDate} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input id="hasVehicle" name="hasVehicle" type="checkbox" className="size-4 accent-primary" defaultChecked={volunteer.hasVehicle} />
              <Label htmlFor="hasVehicle">Has a vehicle</Label>
            </div>
          </div>
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <p className="text-xs text-muted-foreground">
            Role, username and password are changed by the Main Admin under Users &amp; roles.
          </p>
          <SubmitButton>Save changes</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
