"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Shows a temporary password ONE time. It is never stored or emailed —
 * once the Main Admin leaves this page it is gone, which is the point.
 */
export function TempPasswordBanner({ username, password }: { username: string; password: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the password is still visible to select by hand.
    }
  }
  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-900/20 dark:text-amber-100">
      <AlertTitle>Temporary password for @{username}</AlertTitle>
      <AlertDescription>
        <p>Share this with the person directly (in person or by a message they control). It is shown only once and they must change it on first sign-in.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-background px-2 py-1 font-mono text-base tracking-wide select-all">{password}</code>
          <Button type="button" size="sm" variant="outline" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
