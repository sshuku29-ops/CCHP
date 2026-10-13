"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { actionUser, isAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { parseDateInput } from "@/lib/dates";
import { LEADERSHIP_ROLES } from "@/lib/constants";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/action-result";

/**
 * Lets a signed-in user edit their OWN profile. Username and role are never
 * touched here (Main Admin changes those under Settings > Users).
 */

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
// Checkboxes arrive as "on" when ticked and are missing when not.
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

const baseSchema = z.object({
  email: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().email("Enter a valid email address.").max(200).optional()),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(30, "Phone number is too long.").optional()),
  graduationDate: z.preprocess(emptyToUndefined, z.string().refine((v) => parseDateInput(v) !== null, "Enter a valid date.").optional()),
  hasVehicle: checkbox,
  publicHoursOptIn: checkbox,
});

// Extra fields only admins can set (they appear on the public leadership page).
const adminSchema = z.object({
  leadershipTitle: z.preprocess(emptyToUndefined, z.enum(LEADERSHIP_ROLES).optional()),
  bio: z.preprocess(emptyToUndefined, z.string().trim().max(1500, "Keep your bio under 1500 characters.").optional()),
  photoUrl: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(500)
      .url("Enter a full URL.")
      .refine((u) => u.startsWith("https://"), "Photo links must start with https://")
      .optional(),
  ),
  showOnPublicSite: checkbox,
});

export async function updateAccountAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await actionUser();
  const raw = Object.fromEntries(formData);

  const base = baseSchema.safeParse(raw);
  if (!base.success) return { fieldErrors: fieldErrorsFromZod(base.error.issues) };

  const data: Prisma.UserUpdateInput = {
    email: base.data.email ?? null,
    phone: base.data.phone ?? null,
    graduationDate: base.data.graduationDate ? parseDateInput(base.data.graduationDate) : null,
    hasVehicle: base.data.hasVehicle,
    publicHoursOptIn: base.data.publicHoursOptIn,
  };

  if (isAdmin(user)) {
    const extra = adminSchema.safeParse(raw);
    if (!extra.success) return { fieldErrors: fieldErrorsFromZod(extra.error.issues) };
    data.leadershipTitle = extra.data.leadershipTitle ?? null;
    data.bio = extra.data.bio ?? null;
    data.photoUrl = extra.data.photoUrl ?? null;
    data.showOnPublicSite = extra.data.showOnPublicSite;
  }

  try {
    await db.user.update({ where: { id: user.id }, data });
  } catch (e) {
    // P2002 = unique constraint failed (someone else already uses this email).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { fieldErrors: { email: "That email is already used by another account." } };
    }
    throw e;
  }
  await audit(user.id, "account.update");
  revalidatePath("/account");
  revalidatePath("/", "layout"); // leadership title shows in the sidebar
  return { ok: true, message: "Account updated." };
}
