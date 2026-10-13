"use client";

import { useTransition, type ComponentProps } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

/**
 * One-click button that runs a server action (no confirmation dialog).
 * Shows the action's message as a toast. Used for "Claim" / "Release" on tasks.
 * Usage: <ActionButton action={claimTask.bind(null, id)}>Claim</ActionButton>
 */
export function ActionButton({
  action,
  children,
  ...props
}: ComponentProps<typeof Button> & { action: () => Promise<ActionResult> }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      disabled={pending || props.disabled}
      onClick={() =>
        start(async () => {
          try {
            const res = await action();
            if (res?.error) toast.error(res.error);
            else if (res?.message) toast.success(res.message);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
          }
        })
      }
      {...props}
    >
      {pending ? "Working…" : children}
    </Button>
  );
}
