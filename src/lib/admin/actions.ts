"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionMainAdmin } from "@/lib/auth/guards";
import { destroyAllSessionsForUser } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { audit } from "@/lib/audit";
import { ROLES, MODULES, LEADERSHIP_ROLES, type Role } from "@/lib/constants";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/action-result";
import { generateTempPassword } from "./temp-password";

/**
 * Every action in this file is Main Admin only (`actionMainAdmin()` throws
 * for anyone else). Each one writes an AuditLog row so the team can see who
 * changed what on the /settings page.
 */

/** Result for actions that hand back a one-time temporary password. */
export type TempPasswordResult = ActionResult & { tempPassword?: string; userId?: string };

// ─────────────────────────── validation ───────────────────────────

const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .transform((v) => (v === "" ? null : v.toLowerCase()))
  .pipe(z.email("Enter a valid email address.").nullable());

const leadershipTitle = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.enum(LEADERSHIP_ROLES).nullable());

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(60),
  lastName: z.string().trim().min(1, "Last name is required.").max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,30}$/, "3–30 characters: lowercase letters, digits, dots, underscores or dashes."),
  email: optionalEmail,
  leadershipTitle,
});

const roleSchema = z.enum(ROLES, { message: "Choose a role." });

/** Prisma unique-constraint errors become friendly field errors. */
function uniqueError(e: unknown): ActionResult | null {
  const err = e as { code?: string; meta?: { target?: string[] | string } };
  if (err?.code !== "P2002") return null;
  const target = String(err.meta?.target ?? "");
  if (target.includes("email")) return { fieldErrors: { email: "That email is already used by another account." } };
  return { fieldErrors: { username: "That username is already taken." } };
}

/** True when at least one OTHER active Main Admin exists. */
async function anotherActiveMainAdminExists(excludeId: string) {
  const n = await db.user.count({ where: { role: "MAIN_ADMIN", isActive: true, NOT: { id: excludeId } } });
  return n > 0;
}

// ─────────────────────────── create ───────────────────────────

export async function createUserAction(_prev: TempPasswordResult, formData: FormData): Promise<TempPasswordResult> {
  const actor = await actionMainAdmin();
  const parsed = profileSchema.extend({ role: roleSchema }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const data = parsed.data;

  // The temporary password is shown ONCE to the Main Admin, never emailed.
  const tempPassword = generateTempPassword();
  try {
    const user = await db.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        email: data.email,
        role: data.role,
        leadershipTitle: data.role === "VOLUNTEER" ? null : data.leadershipTitle,
        passwordHash: await hashPassword(tempPassword),
        mustChangePassword: true,
      },
      select: { id: true },
    });
    await audit(actor.id, "user.create", user.id, { username: data.username, role: data.role });
    revalidatePath("/settings/users");
    return { ok: true, message: `Account @${data.username} created.`, tempPassword, userId: user.id };
  } catch (e) {
    return uniqueError(e) ?? { error: "Could not create the account. Please try again." };
  }
}

// ─────────────────────────── edit profile ───────────────────────────

export async function updateUserProfileAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const actor = await actionMainAdmin();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const existing = await db.user.findUnique({ where: { id }, select: { role: true } });
  if (!existing) return { error: "User not found." };
  const data = parsed.data;
  try {
    await db.user.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        email: data.email,
        leadershipTitle: existing.role === "VOLUNTEER" ? null : data.leadershipTitle,
      },
    });
  } catch (e) {
    return uniqueError(e) ?? { error: "Could not save changes." };
  }
  await audit(actor.id, "user.update", id, { username: data.username });
  revalidatePath("/settings/users");
  revalidatePath(`/settings/users/${id}`);
  return { ok: true, message: "Profile saved." };
}

// ─────────────────────────── role ───────────────────────────

export async function changeUserRoleAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const actor = await actionMainAdmin();
  const parsed = roleSchema.safeParse(formData.get("role"));
  if (!parsed.success) return { fieldErrors: { role: "Choose a role." } };
  const newRole: Role = parsed.data;
  const user = await db.user.findUnique({ where: { id }, select: { role: true, isActive: true } });
  if (!user) return { error: "User not found." };
  if (user.role === newRole) return { ok: true, message: "Role unchanged." };

  if (id === actor.id && newRole !== "MAIN_ADMIN") {
    return { error: "You cannot change your own role. Ask another Main Admin to do it." };
  }
  if (user.role === "MAIN_ADMIN" && user.isActive && !(await anotherActiveMainAdminExists(id))) {
    return { error: "This is the only active Main Admin. Promote someone else first." };
  }

  await db.user.update({
    where: { id },
    data: {
      role: newRole,
      // Module scoping only applies to Admins; leadership titles only to admins.
      allowedModules: newRole === "ADMIN" ? undefined : null,
      leadershipTitle: newRole === "VOLUNTEER" ? null : undefined,
      showOnPublicSite: newRole === "VOLUNTEER" ? false : undefined,
    },
  });
  // A role change must log the person out everywhere (spec §8.1).
  await destroyAllSessionsForUser(id);
  await audit(actor.id, "user.role", id, { from: user.role, to: newRole });
  revalidatePath("/settings/users");
  revalidatePath(`/settings/users/${id}`);
  return { ok: true, message: `Role changed to ${newRole.replace("_", " ").toLowerCase()}. They have been signed out everywhere.` };
}

// ─────────────────────────── module scope (Admins) ───────────────────────────

export async function setAllowedModulesAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const actor = await actionMainAdmin();
  const user = await db.user.findUnique({ where: { id }, select: { role: true } });
  if (!user) return { error: "User not found." };
  if (user.role !== "ADMIN") return { error: "Module scoping only applies to Admin accounts." };

  const allModules = formData.get("all") === "on";
  let value: string | null = null;
  if (!allModules) {
    const picked = formData.getAll("modules").map(String);
    const valid = MODULES.filter((m) => picked.includes(m));
    if (valid.length === 0) return { error: "Pick at least one module, or choose “All modules”." };
    value = JSON.stringify(valid);
  }
  await db.user.update({ where: { id }, data: { allowedModules: value } });
  await audit(actor.id, "user.modules", id, { allowedModules: value });
  revalidatePath("/settings/users");
  revalidatePath(`/settings/users/${id}`);
  return { ok: true, message: allModules ? "Admin can open every module." : "Module access saved." };
}

// ─────────────────────────── activate / deactivate ───────────────────────────

export async function setUserActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const actor = await actionMainAdmin();
  const user = await db.user.findUnique({ where: { id }, select: { role: true, isActive: true } });
  if (!user) return { error: "User not found." };
  if (!active) {
    if (id === actor.id) return { error: "You cannot deactivate your own account." };
    if (user.role === "MAIN_ADMIN" && !(await anotherActiveMainAdminExists(id))) {
      return { error: "This is the only active Main Admin. Promote someone else first." };
    }
  }
  await db.user.update({ where: { id }, data: { isActive: active } });
  if (!active) await destroyAllSessionsForUser(id);
  await audit(actor.id, active ? "user.reactivate" : "user.deactivate", id);
  revalidatePath("/settings/users");
  revalidatePath(`/settings/users/${id}`);
  return { ok: true };
}

// ─────────────────────────── reset password ───────────────────────────

export async function resetUserPasswordAction(id: string): Promise<TempPasswordResult> {
  const actor = await actionMainAdmin();
  const user = await db.user.findUnique({ where: { id }, select: { username: true } });
  if (!user) return { error: "User not found." };
  const tempPassword = generateTempPassword();
  await db.user.update({
    where: { id },
    data: {
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
  await destroyAllSessionsForUser(id);
  await audit(actor.id, "user.password_reset", id);
  revalidatePath(`/settings/users/${id}`);
  return { ok: true, tempPassword, userId: id, message: `Temporary password set for @${user.username}.` };
}

// ─────────────────────────── delete ───────────────────────────

export async function deleteUserAction(id: string): Promise<ActionResult> {
  const actor = await actionMainAdmin();
  if (id === actor.id) return { error: "You cannot delete your own account." };
  const user = await db.user.findUnique({
    where: { id },
    select: {
      username: true,
      role: true,
      isActive: true,
      _count: { select: { hoursLogs: true, submissions: true, sessionParticipation: true } },
    },
  });
  if (!user) return { error: "User not found." };
  if (user.role === "MAIN_ADMIN" && user.isActive && !(await anotherActiveMainAdminExists(id))) {
    return { error: "This is the only active Main Admin. Promote someone else first." };
  }
  const c = user._count;
  if (c.hoursLogs > 0 || c.submissions > 0 || c.sessionParticipation > 0) {
    return {
      error:
        `This account has history (${c.hoursLogs} hours logs, ${c.submissions} submissions, ` +
        `${c.sessionParticipation} session records) that the annual report depends on. Deactivate it instead of deleting.`,
    };
  }
  await db.user.delete({ where: { id } });
  await audit(actor.id, "user.delete", id, { username: user.username });
  revalidatePath("/settings/users");
  return { ok: true };
}

// ─────────────────────────── danger zone ───────────────────────────

/** Deletes every session row, including the Main Admin's own. */
export async function signOutAllUsersAction(): Promise<ActionResult> {
  const actor = await actionMainAdmin();
  const { count } = await db.session.deleteMany({});
  await audit(actor.id, "sessions.sign_out_all", undefined, { count });
  return { ok: true };
}
