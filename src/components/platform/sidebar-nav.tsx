"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, Bell, Target, FolderKanban, ListChecks, Hourglass, MessageSquare,
  UserPlus, Users, GraduationCap, Clock, BookOpen, FileText, Globe, ArrowRightLeft, ShieldCheck, Settings,
  NotebookPen, Library, Award, UsersRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavGroup } from "./nav-config";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, CalendarDays, Bell, Target, FolderKanban, ListChecks, Hourglass, MessageSquare,
  UserPlus, Users, GraduationCap, Clock, BookOpen, FileText, Globe, ArrowRightLeft, ShieldCheck, Settings,
  NotebookPen, Library, Award, UsersRound,
};

export function SidebarNav({ groups, unread, onNavigate }: { groups: NavGroup[]; unread: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-5 text-sm">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const Icon = ICONS[item.icon] ?? ListChecks;
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) || (item.href === "/settings" && pathname === "/settings");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-foreground/80 hover:bg-sidebar-accent hover:text-foreground",
                      active && "bg-sidebar-accent text-foreground font-medium",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.href === "/notifications" && unread > 0 ? (
                      <span className="rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 leading-none">{unread}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
