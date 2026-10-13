"use client";

import { useActionState } from "react";
import { createUserAction, type TempPasswordResult } from "@/lib/admin/actions";
import { ROLES, ROLE_LABELS, LEADERSHIP_ROLES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/shared/native-select";
import { FieldError } from "@/components/shared/field-error";
import { TempPasswordBanner } from "./temp-password-banner";

/** Main Admin creates an account; the temp password appears once in the banner. */
export function CreateUserForm() {
  const [state, action, pending] = useActionState<TempPasswordResult, FormData>(createUserAction, null);
  const err = state?.fieldErrors ?? {};
  // After success we remount the form (key) so the fields clear but the banner stays.
  const formKey = state?.ok ? state.userId : "new";
  return (
    <div className="space-y-4">
      {state?.ok && state.tempPassword ? (
        <TempPasswordBanner username={state.username ?? ""} password={state.tempPassword} />
      ) : null}
      <form key={formKey} action={action} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required maxLength={60} />
          <FieldError msg={err.firstName} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required maxLength={60} />
          <FieldError msg={err.lastName} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" required minLength={3} maxLength={30} autoCapitalize="none" placeholder="e.g. jsmith" />
          <p className="text-xs text-muted-foreground">Lowercase letters, digits, dots, underscores, dashes.</p>
          <FieldError msg={err.username} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email (optional)</Label>
          <Input id="email" name="email" type="email" maxLength={200} />
          <FieldError msg={err.email} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role">Role</Label>
          <NativeSelect id="role" name="role" defaultValue="VOLUNTEER">
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </NativeSelect>
          <FieldError msg={err.role} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="leadershipTitle">Leadership title (admins only)</Label>
          <NativeSelect id="leadershipTitle" name="leadershipTitle" defaultValue="">
            <option value="">None</option>
            {LEADERSHIP_ROLES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </NativeSelect>
          <FieldError msg={err.leadershipTitle} />
        </div>
        {state?.error ? <p className="text-sm text-destructive sm:col-span-2">{state.error}</p> : null}
        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create account"}</Button>
          <p className="text-xs text-muted-foreground">A random temporary password is generated for you. The person must change it on first sign-in.</p>
        </div>
      </form>
    </div>
  );
}
