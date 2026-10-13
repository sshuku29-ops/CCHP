"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar-nav";
import type { NavGroup } from "./nav-config";
import { UserMenu, type MenuUser } from "./user-menu";
import { MobileNotice } from "./mobile-notice";

export function Shell({
  groups,
  unread,
  user,
  readOnlyOnPhones = false,
  children,
}: {
  groups: NavGroup[];
  unread: number;
  user: MenuUser;
  /** Admins: phones get a read-only view (see globals.css `.platform-readonly`). */
  readOnlyOnPhones?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    // The CSS behind `platform-readonly` only applies under 768px, so the class
    // can be set for every admin without a hydration mismatch.
    <div className={cn("flex min-h-screen", readOnlyOnPhones && "platform-readonly")}>
      {readOnlyOnPhones ? <MobileNotice /> : null}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-4 sticky top-0 h-screen overflow-y-auto" data-allow-mobile>
        <Link href="/dashboard" className="px-2 mb-6 flex items-baseline gap-2">
          <span className="font-heading text-xl font-semibold">CCHP</span>
          <span className="text-xs text-muted-foreground">platform</span>
        </Link>
        <SidebarNav groups={groups} unread={unread} />
        <div className="mt-auto pt-6">
          <UserMenu user={user} />
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-20 flex items-center gap-2 border-b bg-background/95 backdrop-blur px-3 py-2" data-allow-mobile>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 px-3 py-4 overflow-y-auto" data-allow-mobile>
              <SheetTitle className="font-heading text-lg px-2 mb-4">CCHP</SheetTitle>
              <SidebarNav groups={groups} unread={unread} onNavigate={() => setOpen(false)} />
              <div className="mt-6"><UserMenu user={user} /></div>
            </SheetContent>
          </Sheet>
          <Link href="/dashboard" className="font-heading font-semibold">CCHP</Link>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
