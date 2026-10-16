"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Top navigation. Nav labels are literal on purpose (they are not prose). */
const NAV = [
  { href: "/team", label: "Team" },
  { href: "/impact", label: "Impact" },
  { href: "/reports", label: "Reports" },
  { href: "/resources", label: "Resources" },
  { href: "/partners", label: "Partners" },
  { href: "/contact", label: "Contact" },
];

/**
 * Simple top bar: wordmark on the left, links on the right, a green Apply
 * button, and a hamburger that opens a plain list on small screens.
 * Hidden when printing (reports are meant to be printable).
 */
export function SiteHeader({ fullName = "Colby Community Health Program" }: { fullName?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="print:hidden border-b bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex flex-col leading-tight" aria-label="CCHP home" onClick={() => setOpen(false)}>
          <span className="font-heading text-xl font-semibold tracking-tight">CCHP</span>
          <span className="text-[11px] text-muted-foreground sm:text-xs">{fullName}</span>
        </Link>

        {/* Desktop links */}
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    isActive(item.href) ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="lg" className="hidden md:inline-flex px-4">
            <Link href="/apply">Apply</Link>
          </Button>
          {/* Mobile menu toggle */}
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {/* Mobile links (plain stacked list) */}
      {open ? (
        <nav id="mobile-nav" aria-label="Main" className="border-t md:hidden">
          <ul className="mx-auto max-w-5xl px-4 py-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2.5 text-base font-medium hover:bg-muted",
                    isActive(item.href) ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="px-3 py-3">
              <Button asChild size="lg" className="w-full">
                <Link href="/apply" onClick={() => setOpen(false)}>
                  Apply
                </Link>
              </Button>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
