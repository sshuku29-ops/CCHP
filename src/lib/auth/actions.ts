"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword, passwordProblems } from "./password";
import { createSession, destroySession, destroyAllSessionsForUser, getCurrentUser } from "./session";
import { rateLimit, clientIpKey } from "./rate-limit";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/lib/action-result";

const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      username: z.string().trim().min(1, "Enter your username.").max(100),
      password: z.string().min(1, "Enter your password.").max(200),
      next: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter your username and password." };
  const { username, password } = parsed.data;

  const ipKey = await clientIpKey();
  const limit = await rateLimit({ key: `login:${ipKey}`, limit: 20, windowSeconds: 15 * 60 });
  if (!limit.ok) return { error: "Too many attempts. Please wait a few minutes and try again." };

  const user = await db.user.findFirst({
    where: { OR: [{ username: username.toLowerCase() }, { username }, { email: username.toLowerCase() }] },
  });
  const generic = { error: "Incorrect username or password." };
  if (!user || !user.isActive) {
    await verifyPassword(password, "$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsaltinvalidsalt12"); // constant-time-ish
    return generic;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return { error: `Account temporarily locked. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const failed = user.failedLoginCount + 1;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: failed,
        lockedUntil: failed >= LOCK_AFTER ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
      },
    });
    await audit(null, "login.failed", user.id);
    return generic;
  }
  await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await createSession(user.id);
  await audit(user.id, "login.success");
  const next = parsed.data.next && parsed.data.next.startsWith("/") && !parsed.data.next.startsWith("//") ? parsed.data.next : "/dashboard";
  redirect(user.mustChangePassword ? "/change-password" : next);
}

export async function logoutAction() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit(user.id, "logout");
  redirect("/login");
}

export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = z
    .object({
      current: z.string().max(200),
      password: z.string().max(200),
      confirm: z.string().max(200),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please fill in every field." };
  const { current, password, confirm } = parsed.data;
  const full = await db.user.findUnique({ where: { id: user.id } });
  if (!full) redirect("/login");
  if (!(await verifyPassword(current, full.passwordHash))) return { fieldErrors: { current: "Current password is incorrect." } };
  const problem = passwordProblems(password);
  if (problem) return { fieldErrors: { password: problem } };
  if (password !== confirm) return { fieldErrors: { confirm: "Passwords do not match." } };
  if (password === current) return { fieldErrors: { password: "Choose a different password." } };
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), mustChangePassword: false },
  });
  // Log out every other device, then start a fresh session here.
  await destroyAllSessionsForUser(user.id);
  await createSession(user.id);
  await audit(user.id, "password.changed");
  redirect("/dashboard?pw=changed");
}
