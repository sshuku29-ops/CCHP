"use client";

import { useTransition, type ComponentProps } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * A button that runs a one-click server action (no confirmation).
 * Usage: <ActionButton action={toggleCycleOpenAction.bind(null, id)}>Open</ActionButton>
 * The action may return { error } to show a toast.
 */
export function ActionButton({
  action,
  children,
  ...props
}: ComponentProps<typeof Button> & { action: () => Promise<unknown> }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      disabled={pending || props.disabled}
      onClick={() =>
        start(async () => {
          try {
            const res = (await action()) as { error?: string } | undefined;
            if (res?.error) toast.error(res.error);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
          }
        })
      }
      {...props}
    >
      {children}
    </Button>
  );
}
