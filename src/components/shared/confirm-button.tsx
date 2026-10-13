"use client";

import { useTransition, type ComponentProps } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Button that asks for confirmation then runs a server action.
 * Usage: <ConfirmButton action={deleteThing.bind(null, id)} message="Delete this task?">Delete</ConfirmButton>
 */
export function ConfirmButton({
  action,
  message = "Are you sure?",
  children,
  onDone,
  ...props
}: ComponentProps<typeof Button> & { action: () => Promise<unknown>; message?: string; onDone?: () => void }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      disabled={pending || props.disabled}
      onClick={() => {
        if (!window.confirm(message)) return;
        start(async () => {
          try {
            const res = (await action()) as { error?: string } | undefined;
            if (res?.error) toast.error(res.error);
            else onDone?.();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
          }
        });
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
