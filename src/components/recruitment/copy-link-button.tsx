"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Copies the full public URL of a cycle (origin + path) to the clipboard.
 * The origin comes from the browser so the same code works locally and on
 * the real domain.
 */
export function CopyLinkButton({ path, label = "Copy link" }: { path: string; label?: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}${path}`);
          toast.success("Public link copied.");
        } catch {
          toast.error("Could not access the clipboard. Copy the link from the address bar instead.");
        }
      }}
    >
      {label}
    </Button>
  );
}
