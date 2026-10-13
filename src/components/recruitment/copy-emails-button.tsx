"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Copies a list of email addresses to the clipboard (comma-separated), so an
 * admin can paste them into their own email client. Follow-up email is manual
 * by design — the platform never emails applicants.
 */
export function CopyEmailsButton({ emails, label }: { emails: string[]; label: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={emails.length === 0}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(emails.join(", "));
          toast.success(`Copied ${emails.length} address${emails.length === 1 ? "" : "es"}.`);
        } catch {
          toast.error("Could not access the clipboard. Use the CSV export instead.");
        }
      }}
    >
      {label} ({emails.length})
    </Button>
  );
}
