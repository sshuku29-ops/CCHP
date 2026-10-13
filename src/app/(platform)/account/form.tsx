"use client";

import { ActionForm } from "@/components/shared/action-form";
import { updateAccountAction } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/native-select";
import { FieldError } from "@/components/shared/field-error";
import { LEADERSHIP_ROLES } from "@/lib/constants";

export type AccountFormValues = {
  email: string;
  phone: string;
  graduationDate: string; // YYYY-MM-DD or ""
  hasVehicle: boolean;
  publicHoursOptIn: boolean;
  // Admin-only
  leadershipTitle: string;
  bio: string;
  photoUrl: string;
  showOnPublicSite: boolean;
};

export function AccountForm({ initial, admin }: { initial: AccountFormValues; admin: boolean }) {
  return (
    <ActionForm action={updateAccountAction} className="space-y-6">
      {(state, pending) => (
        <>
          <section className="space-y-4">
            <h2 className="font-heading text-lg font-semibold">Contact</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={initial.email} autoComplete="email" maxLength={200} />
                <p className="text-xs text-muted-foreground">Used for reminder digests. Only admins can see it.</p>
                <FieldError msg={state?.fieldErrors?.email} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" defaultValue={initial.phone} autoComplete="tel" maxLength={30} />
                <FieldError msg={state?.fieldErrors?.phone} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="graduationDate">Graduation date</Label>
                <Input id="graduationDate" name="graduationDate" type="date" defaultValue={initial.graduationDate} />
                <FieldError msg={state?.fieldErrors?.graduationDate} />
              </div>
              <div className="space-y-1.5">
                <Label className="block">Transportation</Label>
                <label className="flex items-center gap-2 text-sm h-8">
                  <input type="checkbox" name="hasVehicle" defaultChecked={initial.hasVehicle} className="size-4 rounded border-input" />
                  I have a vehicle I can use for CCHP
                </label>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-lg font-semibold">Public website</h2>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="publicHoursOptIn" defaultChecked={initial.publicHoursOptIn} className="mt-0.5 size-4 rounded border-input" />
              <span>
                Show my name and total volunteer hours on the public CCHP website
                <span className="block text-xs text-muted-foreground mt-0.5">
                  This is opt-in. When ticked, visitors to the public site will see your first and last name next to the number of hours you have logged. Nothing else (no email, phone or class year) is shown. Untick at any time to remove it.
                </span>
              </span>
            </label>
          </section>

          {admin ? (
            <section className="space-y-4">
              <h2 className="font-heading text-lg font-semibold">Leadership profile</h2>
              <p className="text-sm text-muted-foreground">Shown on the public &ldquo;Leadership team&rdquo; section when &ldquo;Show on public site&rdquo; is ticked.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="leadershipTitle">Leadership title</Label>
                  <NativeSelect id="leadershipTitle" name="leadershipTitle" defaultValue={initial.leadershipTitle}>
                    <option value="">— none —</option>
                    {LEADERSHIP_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </NativeSelect>
                  <FieldError msg={state?.fieldErrors?.leadershipTitle} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="photoUrl">Photo URL</Label>
                  <Input id="photoUrl" name="photoUrl" type="url" defaultValue={initial.photoUrl} placeholder="https://…" maxLength={500} />
                  <p className="text-xs text-muted-foreground">A link to a photo hosted elsewhere (https only).</p>
                  <FieldError msg={state?.fieldErrors?.photoUrl} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="bio">Short bio</Label>
                  <Textarea id="bio" name="bio" defaultValue={initial.bio} rows={4} maxLength={1500} />
                  <FieldError msg={state?.fieldErrors?.bio} />
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" name="showOnPublicSite" defaultChecked={initial.showOnPublicSite} className="size-4 rounded border-input" />
                  Show me on the public site&rsquo;s leadership team
                </label>
              </div>
            </section>
          ) : null}

          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
        </>
      )}
    </ActionForm>
  );
}
