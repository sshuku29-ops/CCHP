"use client";

import { useTransition, type ComponentProps } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

/**
 * Runs a certificate server action (generate one / generate all) and toasts
 * the result. Shows "Working…" while the PDF is built.
 */
export function GenerateButton({
  action,
  confirm,
  children,
  ...props
}: ComponentProps<typeof Button> & { action: () => Promise<ActionResult>; confirm?: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      disabled={pending || props.disabled}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          try {
            const res = await action();
            if (res?.error) toast.error(res.error);
            else if (res?.message) toast.success(res.message);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
          }
        });
      }}
      {...props}
    >
      {pending ? "Working…" : children}
    </Button>
  );
}
