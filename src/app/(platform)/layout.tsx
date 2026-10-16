import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser, allowedModules, isAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { NAV } from "@/components/platform/nav-config";
import { Shell } from "@/components/platform/shell";

export default async function PlatformLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  // Forced password rotation for freshly-created accounts. The proxy stamps
  // x-pathname on every request so the layout knows where we are.
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (user.mustChangePassword && !pathname.startsWith("/change-password")) {
    redirect("/change-password");
  }
  // First-login photo prompt: shown once per account (see /welcome). People
  // who already have a photo, or who answered the prompt, are never sent there.
  const onPromptSafePage = pathname.startsWith("/welcome") || pathname.startsWith("/change-password") || pathname.startsWith("/account");
  if (!user.photoKey && !user.photoPromptSeenAt && !onPromptSafePage) {
    redirect("/welcome");
  }
  const mods = allowedModules(user);
  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => (i.roles ? i.roles.includes(user.role) : true) && (i.module ? mods.includes(i.module) : true)),
  })).filter((g) => g.items.length > 0);
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  return (
    <Shell
      groups={groups}
      unread={unread}
      // Admins get a read-only phone view (editing works best on a computer).
      readOnlyOnPhones={isAdmin(user)}
      user={{
        name: `${user.firstName} ${user.lastName}`,
        role: user.leadershipTitle ?? ROLE_LABELS[user.role as Role],
        firstName: user.firstName,
        lastName: user.lastName,
        photoKey: user.photoKey,
      }}
    >
      {children}
    </Shell>
  );
}
