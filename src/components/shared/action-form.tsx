"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";

/**
 * Thin wrapper around useActionState for forms whose action returns ActionResult.
 * Shows toast on error/success. Children receive the state for field errors.
 */
export function ActionForm({
  action,
  children,
  className,
  successMessage,
  onSuccess,
  resetOnSuccess,
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children: (state: ActionResult, pending: boolean) => ReactNode;
  className?: string;
  successMessage?: string;
  onSuccess?: () => void;
  resetOnSuccess?: boolean;
}) {
  // Incremented on each success so the form remounts (clearing inputs) when resetOnSuccess is set.
  const [resetKey, setResetKey] = useState(0);
  const [state, formAction, pending] = useActionState(async (prev: ActionResult, fd: FormData) => {
    const res = await action(prev, fd);
    if (res?.ok && resetOnSuccess) setResetKey((k) => k + 1);
    return res;
  }, null);
  useEffect(() => {
    if (!state) return;
    if (state.error) toast.error(state.error);
    if (state.ok) {
      if (successMessage || state.message) toast.success(state.message ?? successMessage);
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <form
      action={formAction}
      className={className}
      key={resetKey}
    >
      {children(state, pending)}
    </form>
  );
}
