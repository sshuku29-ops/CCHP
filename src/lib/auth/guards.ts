import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "./session";
import { MODULES, type ModuleKey, type Role } from "@/lib/constants";
import { safeJsonParse } from "@/lib/utils";

export class AuthError extends Error {
  status: number;
  constructor(message = "Not authorized", status = 403) {
    super(message);
    this.status = status;
  }
}

export function isAdmin(user: Pick<CurrentUser, "role"> | null | undefined) {
  return user?.role === "ADMIN" || user?.role === "MAIN_ADMIN";
}
export function isMainAdmin(user: Pick<CurrentUser, "role"> | null | undefined) {
  return user?.role === "MAIN_ADMIN";
}

/** Modules the user may open. Volunteers get none (they use their own pages). */
export function allowedModules(user: Pick<CurrentUser, "role" | "allowedModules">): ModuleKey[] {
  if (user.role === "MAIN_ADMIN") return [...MODULES];
  if (user.role === "ADMIN") {
    const scoped = safeJsonParse<string[] | null>(user.allowedModules, null);
    if (!scoped) return [...MODULES];
    return MODULES.filter((m) => scoped.includes(m));
  }
  return [];
}

export function canAccessModule(user: Pick<CurrentUser, "role" | "allowedModules">, mod: ModuleKey) {
  return allowedModules(user).includes(mod);
}

/** Page guard: redirects to /login (or password change) if needed. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role as Role)) redirect("/dashboard?denied=1");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  return requireRole("ADMIN", "MAIN_ADMIN");
}

export async function requireMainAdmin(): Promise<CurrentUser> {
  return requireRole("MAIN_ADMIN");
}

export async function requireModule(mod: ModuleKey): Promise<CurrentUser> {
  const user = await requireUser();
  if (!canAccessModule(user, mod)) redirect("/dashboard?denied=1");
  return user;
}

/** Action guards: throw instead of redirect (use inside server actions / route handlers). */
export async function actionUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Please sign in.", 401);
  return user;
}
export async function actionAdmin(): Promise<CurrentUser> {
  const user = await actionUser();
  if (!isAdmin(user)) throw new AuthError();
  return user;
}
export async function actionMainAdmin(): Promise<CurrentUser> {
  const user = await actionUser();
  if (!isMainAdmin(user)) throw new AuthError();
  return user;
}
export async function actionModule(mod: ModuleKey): Promise<CurrentUser> {
  const user = await actionUser();
  if (!canAccessModule(user, mod)) throw new AuthError();
  return user;
}
