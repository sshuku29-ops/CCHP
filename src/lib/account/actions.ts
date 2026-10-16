"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { actionUser, isAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { parseDateInput } from "@/lib/dates";
import { LEADERSHIP_ROLES } from "@/lib/constants";
import { cleanHtml } from "@/lib/html/sanitize";
import { validateUpload, storeUpload, deleteUpload, IMAGE_EXTENSIONS } from "@/lib/uploads";
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
  // Profile extras (everyone can set these).
  pronouns: z.preprocess(emptyToUndefined, z.string().trim().max(40, "Keep pronouns under 40 characters.").optional()),
  major: z.preprocess(emptyToUndefined, z.string().trim().max(120, "Keep your major under 120 characters.").optional()),
  // HTML from the rich text editor; cleaned with cleanHtml() before saving.
  profileBody: z.preprocess(emptyToUndefined, z.string().max(20_000, "Your About me is too long.").optional()),
  // SMS reminders are strictly opt-in and need a phone number to text.
  smsOptIn: checkbox,
});

// Extra fields only admins can set (they appear on the public leadership page).
const adminSchema = z.object({
  leadershipTitle: z.preprocess(emptyToUndefined, z.enum(LEADERSHIP_ROLES).optional()),
  bio: z.preprocess(emptyToUndefined, z.string().trim().max(1500, "Keep your bio under 1500 characters.").optional()),
  showOnPublicSite: checkbox,
});

/** True when the editor only produced an empty paragraph (nothing typed). */
function isBlankHtml(html: string | undefined) {
  if (!html) return true;
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim() === "";
}

export async function updateAccountAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await actionUser();
  const raw = Object.fromEntries(formData);

  const base = baseSchema.safeParse(raw);
  if (!base.success) return { fieldErrors: fieldErrorsFromZod(base.error.issues) };

  // "Text me reminders" only makes sense with a number to text.
  if (base.data.smsOptIn && !base.data.phone) {
    return { fieldErrors: { smsOptIn: "Add a phone number to receive text reminders." } };
  }

  const cleanedBody = cleanHtml(base.data.profileBody ?? "");
  const data: Prisma.UserUpdateInput = {
    email: base.data.email ?? null,
    phone: base.data.phone ?? null,
    graduationDate: base.data.graduationDate ? parseDateInput(base.data.graduationDate) : null,
    hasVehicle: base.data.hasVehicle,
    publicHoursOptIn: base.data.publicHoursOptIn,
    pronouns: base.data.pronouns ?? null,
    major: base.data.major ?? null,
    profileBody: isBlankHtml(cleanedBody) ? null : cleanedBody,
    smsOptIn: base.data.smsOptIn,
  };

  if (isAdmin(user)) {
    const extra = adminSchema.safeParse(raw);
    if (!extra.success) return { fieldErrors: fieldErrorsFromZod(extra.error.issues) };
    data.leadershipTitle = extra.data.leadershipTitle ?? null;
    data.bio = extra.data.bio ?? null;
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

// ───────────────────────── Profile photo ─────────────────────────

const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Upload (or replace) the signed-in user's profile photo. Used on /account and /welcome. */
export async function uploadPhotoAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await actionUser();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { fieldErrors: { photo: "Choose a photo to upload." } };

  const problem = validateUpload(file, IMAGE_EXTENSIONS, PHOTO_MAX_BYTES);
  if (problem) return { fieldErrors: { photo: problem } };

  const stored = await storeUpload(file);
  const previous = await db.user.findUnique({ where: { id: user.id }, select: { photoKey: true, photoPromptSeenAt: true } });
  await db.user.update({
    where: { id: user.id },
    // Uploading a photo also answers the first-login prompt.
    data: { photoKey: stored.key, photoPromptSeenAt: previous?.photoPromptSeenAt ?? new Date() },
  });
  // Remove the old file only after the new key is saved, so nothing dangles.
  if (previous?.photoKey && previous.photoKey !== stored.key) await deleteUpload(previous.photoKey);

  await audit(user.id, "account.photo.upload");
  revalidatePath("/account");
  revalidatePath("/welcome");
  revalidatePath("/", "layout"); // avatar in the sidebar
  return { ok: true, message: "Photo updated." };
}

/** Remove the signed-in user's profile photo (falls back to initials everywhere). */
export async function removePhotoAction(): Promise<void> {
  const user = await actionUser();
  const current = await db.user.findUnique({ where: { id: user.id }, select: { photoKey: true } });
  if (!current?.photoKey) return;
  await db.user.update({ where: { id: user.id }, data: { photoKey: null } });
  await deleteUpload(current.photoKey);
  await audit(user.id, "account.photo.remove");
  revalidatePath("/account");
  revalidatePath("/", "layout");
}

// ───────────────────────── First-login photo prompt ─────────────────────────

/**
 * "Skip for now" / "Don't ask again" on /welcome. Both stamp photoPromptSeenAt,
 * so the prompt shows once per account and never again (even if they skip).
 */
export async function skipPhotoPromptAction(): Promise<void> {
  const user = await actionUser();
  await db.user.update({ where: { id: user.id }, data: { photoPromptSeenAt: new Date() } });
  revalidatePath("/", "layout");
}
