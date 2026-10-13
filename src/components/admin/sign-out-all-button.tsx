"use client";

import { useRouter } from "next/navigation";
import { signOutAllUsersAction } from "@/lib/admin/actions";
import { ConfirmButton } from "@/components/shared/confirm-button";

/** Deletes every session (including yours) then sends you to the login page. */
export function SignOutAllButton() {
  const router = useRouter();
  return (
    <ConfirmButton
      variant="destructive"
      message="Sign out EVERY user, including yourself? Everyone will need to log in again."
      action={async () => {
        const res = await signOutAllUsersAction();
        if (res?.ok) router.push("/login");
        return res;
      }}
    >
      Sign out all users
    </ConfirmButton>
  );
}
