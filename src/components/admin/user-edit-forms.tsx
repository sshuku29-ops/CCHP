"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateUserProfileAction,
  changeUserRoleAction,
  setAllowedModulesAction,
  setUserActiveAction,
  resetUserPasswordAction,
  deleteUserAction,
  type TempPasswordResult,
} from "@/lib/admin/actions";
import { ROLES, ROLE_LABELS, LEADERSHIP_ROLES, MODULES, MODULE_LABELS, type ModuleKey } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/shared/native-select";
import { FieldError } from "@/components/shared/field-error";
import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { TempPasswordBanner } from "./temp-password-banner";

/** The fields the edit page passes down (never the password hash). */
export type EditableUser = {
  id: string;
  username: string;
  email: string | null;
  role: string;
  allowedModules: string | null;
  firstName: string;
  lastName: string;
  leadershipTitle: string | null;
  isActive: boolean;
  canDelete: boolean;
  historyNote: string;
};

// ─────────────────────────── profile ───────────────────────────

export function UserProfileForm({ user }: { user: EditableUser }) {
  const save = updateUserProfileAction.bind(null, user.id);
  const isVolunteer = user.role === "VOLUNTEER";
  return (
    <ActionForm action={save} className="grid gap-4 sm:grid-cols-2">
      {(state) => {
        const err = state?.fieldErrors ?? {};
        return (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" defaultValue={user.firstName} required maxLength={60} />
              <FieldError msg={err.firstName} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" defaultValue={user.lastName} required maxLength={60} />
              <FieldError msg={err.lastName} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" defaultValue={user.username} required minLength={3} maxLength={30} autoCapitalize="none" />
              <FieldError msg={err.username} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" name="email" type="email" defaultValue={user.email ?? ""} maxLength={200} />
              <FieldError msg={err.email} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="leadershipTitle">Leadership title</Label>
              <NativeSelect id="leadershipTitle" name="leadershipTitle" defaultValue={user.leadershipTitle ?? ""} disabled={isVolunteer}>
                <option value="">None</option>
                {LEADERSHIP_ROLES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </NativeSelect>
              {isVolunteer ? <p className="text-xs text-muted-foreground">Only admin accounts can hold a leadership title.</p> : null}
              <FieldError msg={err.leadershipTitle} />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton>Save profile</SubmitButton>
            </div>
          </>
        );
      }}
    </ActionForm>
  );
}

// ─────────────────────────── role ───────────────────────────

export function UserRoleForm({ user, isSelf }: { user: EditableUser; isSelf: boolean }) {
  const save = changeUserRoleAction.bind(null, user.id);
  return (
    <ActionForm action={save} className="space-y-3">
      {(state) => (
        <>
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="role">Role</Label>
            <NativeSelect id="role" name="role" defaultValue={user.role} disabled={isSelf}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </NativeSelect>
            <FieldError msg={state?.fieldErrors?.role} />
          </div>
          <p className="text-xs text-muted-foreground">
            {isSelf ? "You cannot change your own role." : "Changing the role signs this person out of every device."}
          </p>
          <SubmitButton variant="outline" disabled={isSelf}>Change role</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

// ─────────────────────────── module scope (Admins only) ───────────────────────────

export function ModuleScopeForm({ user, current }: { user: EditableUser; current: ModuleKey[] | null }) {
  const save = setAllowedModulesAction.bind(null, user.id);
  const [all, setAll] = useState(current === null);
  return (
    <ActionForm action={save} className="space-y-4">
      {() => (
        <>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox name="all" checked={all} onCheckedChange={(v) => setAll(v === true)} />
            All modules (no restriction)
          </label>
          <div className={`grid gap-2 sm:grid-cols-2 ${all ? "opacity-50" : ""}`}>
            {MODULES.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <Checkbox name="modules" value={m} defaultChecked={current?.includes(m) ?? false} disabled={all} />
                {MODULE_LABELS[m]}
              </label>
            ))}
          </div>
          <SubmitButton variant="outline">Save module access</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

// ─────────────────────────── danger zone ───────────────────────────

export function UserDangerZone({ user, isSelf }: { user: EditableUser; isSelf: boolean }) {
  const router = useRouter();
  const [reset, setReset] = useState<TempPasswordResult>(null);

  return (
    <div className="space-y-4">
      {reset?.ok && reset.tempPassword ? <TempPasswordBanner username={user.username} password={reset.tempPassword} /> : null}

      <div className="flex flex-wrap gap-2">
        <ConfirmButton
          variant="outline"
          message={`Reset the password for @${user.username}? They will be signed out everywhere and must choose a new password.`}
          action={async () => {
            const res = await resetUserPasswordAction(user.id);
            if (res?.ok) {
              setReset(res);
              toast.success("Temporary password generated.");
            }
            return res;
          }}
        >
          Reset password
        </ConfirmButton>

        {user.isActive ? (
          <ConfirmButton
            variant="outline"
            disabled={isSelf}
            message={`Deactivate @${user.username}? They will be signed out and cannot sign in until reactivated. Their history is kept.`}
            action={async () => {
              const res = await setUserActiveAction(user.id, false);
              if (res?.ok) toast.success("Account deactivated.");
              return res;
            }}
          >
            Deactivate
          </ConfirmButton>
        ) : (
          <ConfirmButton
            variant="outline"
            message={`Reactivate @${user.username}?`}
            action={async () => {
              const res = await setUserActiveAction(user.id, true);
              if (res?.ok) toast.success("Account reactivated.");
              return res;
            }}
          >
            Reactivate
          </ConfirmButton>
        )}

        <ConfirmButton
          variant="destructive"
          disabled={isSelf || !user.canDelete}
          message={`Permanently delete @${user.username}? This cannot be undone.`}
          action={async () => {
            const res = await deleteUserAction(user.id);
            if (res?.ok) {
              toast.success("Account deleted.");
              router.push("/settings/users");
            }
            return res;
          }}
        >
          Delete account
        </ConfirmButton>
      </div>

      <p className="text-xs text-muted-foreground">
        {isSelf
          ? "You cannot deactivate or delete your own account."
          : user.canDelete
            ? "Delete is only available because this account has no hours, submissions, or session history."
            : `${user.historyNote} Deactivate instead so reports stay accurate.`}
      </p>
    </div>
  );
}
