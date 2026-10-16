"use client";

import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STORAGE_KEY = "cchp.mobileNoticeSeen";
const PHONE_QUERY = "(max-width: 767px)";

/**
 * One-time (per browser session) heads-up for admins on phones: the phone
 * view is read-only and editing works best on a computer. The actual
 * read-only behaviour is CSS (`.platform-readonly` in globals.css).
 */
export function MobileNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Only on narrow screens, and only once per session. Deferred a tick so
    // the first paint is not blocked by the dialog opening.
    if (!window.matchMedia(PHONE_QUERY).matches) return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // Private mode or blocked storage: show the notice anyway.
    }
    const id = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  function dismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : dismiss())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Monitor className="size-5" /> Editing works best on a computer</DialogTitle>
          <DialogDescription>
            On a phone the admin platform is <strong>view-only</strong>: you can browse tasks, sessions, hours and the
            directory, but forms and save buttons are turned off. Open the site on a laptop or desktop to make changes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={dismiss}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
