"use client";

import Link from "next/link";
import { ChevronsUpDown, LogOut, UserCircle, KeyRound } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/user-avatar";

export type MenuUser = { name: string; role: string; firstName: string; lastName: string; photoKey: string | null };

export function UserMenu({ user }: { user: MenuUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-sidebar-accent">
        <UserAvatar user={user} size="sm" className="size-7" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{user.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{user.role}</span>
        </span>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" data-allow-mobile>
        <DropdownMenuLabel>Signed in as {user.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/account"><UserCircle /> My account</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/change-password"><KeyRound /> Change password</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          {/* data-allow-mobile: signing out must keep working in the read-only phone view. */}
          <form action="/logout" method="post" className="w-full" data-allow-mobile>
            <button type="submit" className="flex w-full items-center gap-2" data-allow-mobile><LogOut className="size-4" /> Sign out</button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
