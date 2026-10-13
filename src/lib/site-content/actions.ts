"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionModule } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { LEADERSHIP_ROLES } from "@/lib/constants";
import { parseDateInput } from "@/lib/dates";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/action-result";
import { deleteUpload, IMAGE_EXTENSIONS, storeUpload, validateUpload } from "@/lib/uploads";
import { SITE_SETTING_KEYS } from "./queries";

/**
 * Everything here needs the "site" module (Main Admin always has it).
 * After each write we revalidate both the admin page and the public home
 * page so the website updates immediately.
 */
function revalidateSite() {
  revalidatePath("/site-content");
  revalidatePath("/", "layout");
}

// ─────────────────────────── shared field schemas ───────────────────────────

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === "" ? null : v))
  .pipe(z.url("Enter a full link starting with http:// or https://").nullable());

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((v) => (v === "" ? null : v));

const orderField = z.coerce.number().int().min(0).max(9999).default(0);

// ─────────────────────────── General tab ───────────────────────────

export async function saveSiteSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await actionModule("site");
  const parsed = z
    .object({
      mission: z.string().trim().max(2000),
      tagline: z.string().trim().max(200),
      hero_note: z.string().trim().max(1000),
      // Empty is allowed (hides the link on the site); otherwise it must be valid.
      contact_email: z
        .string()
        .trim()
        .max(200)
        .toLowerCase()
        .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address."),
      instagram_url: z
        .string()
        .trim()
        .max(500)
        .refine((v) => v === "" || z.url().safeParse(v).success, "Enter a full link starting with https://"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  // Upsert each key so a missing row never breaks the public site.
  await db.$transaction(
    SITE_SETTING_KEYS.map((key) =>
      db.siteSetting.upsert({ where: { key }, create: { key, value: parsed.data[key] }, update: { value: parsed.data[key] } }),
    ),
  );
  await audit(user.id, "site.settings");
  revalidateSite();
  return { ok: true, message: "Site text saved." };
}

// ─────────────────────────── Leadership tab ───────────────────────────

export async function updateLeadershipProfileAction(userId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const actor = await actionModule("site");
  const parsed = z
    .object({
      leadershipTitle: z
        .string()
        .trim()
        .transform((v) => (v === "" ? null : v))
        .pipe(z.enum(LEADERSHIP_ROLES).nullable()),
      bio: optionalText(1500),
      photoUrl: optionalUrl,
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const showOnPublicSite = formData.get("showOnPublicSite") === "on";
  const target = await db.user.findFirst({ where: { id: userId, role: { in: ["ADMIN", "MAIN_ADMIN"] } }, select: { id: true } });
  if (!target) return { error: "Only admin accounts have a leadership profile." };
  await db.user.update({ where: { id: userId }, data: { ...parsed.data, showOnPublicSite } });
  await audit(actor.id, "site.leadership", userId, { showOnPublicSite, leadershipTitle: parsed.data.leadershipTitle });
  revalidateSite();
  return { ok: true, message: "Leadership profile saved." };
}

// ─────────────────────────── Partners tab ───────────────────────────

const partnerSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  description: optionalText(600),
  url: optionalUrl,
  order: orderField,
});

export async function savePartnerAction(id: string | null, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const actor = await actionModule("site");
  const parsed = partnerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  if (id) {
    await db.communityPartner.update({ where: { id }, data: parsed.data });
    await audit(actor.id, "site.partner.update", id, { name: parsed.data.name });
  } else {
    const row = await db.communityPartner.create({ data: parsed.data, select: { id: true } });
    await audit(actor.id, "site.partner.create", row.id, { name: parsed.data.name });
  }
  revalidateSite();
  return { ok: true, message: id ? "Partner saved." : "Partner added." };
}

export async function deletePartnerAction(id: string): Promise<ActionResult> {
  const actor = await actionModule("site");
  const partner = await db.communityPartner.findUnique({ where: { id }, select: { logoKey: true } });
  await db.communityPartner.delete({ where: { id } }).catch(() => null);
  if (partner?.logoKey) await deleteUpload(partner.logoKey);
  await audit(actor.id, "site.partner.delete", id);
  revalidateSite();
  return { ok: true };
}

/** Logo file types we accept: the usual images plus SVG (vector logos). */
const LOGO_EXTENSIONS = [...IMAGE_EXTENSIONS, "svg"];

/**
 * Upload (or replace) a partner's logo. The file is stored through
 * src/lib/uploads.ts and its key saved on the partner; /api/files/[key]
 * serves partner logos without signing in, so they show on the public site.
 */
export async function uploadPartnerLogoAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const actor = await actionModule("site");
  const partner = await db.communityPartner.findUnique({ where: { id }, select: { id: true, logoKey: true, name: true } });
  if (!partner) return { error: "Partner not found." };
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { fieldErrors: { logo: "Choose an image file." } };
  const problem = validateUpload(file, LOGO_EXTENSIONS, 2 * 1024 * 1024);
  if (problem) return { fieldErrors: { logo: problem } };
  const stored = await storeUpload(file);
  await db.communityPartner.update({ where: { id }, data: { logoKey: stored.key } });
  if (partner.logoKey) await deleteUpload(partner.logoKey); // remove the old file after the swap
  await audit(actor.id, "site.partner.logo", id, { name: partner.name });
  revalidateSite();
  return { ok: true, message: "Logo uploaded." };
}

export async function removePartnerLogoAction(id: string): Promise<ActionResult> {
  const actor = await actionModule("site");
  const partner = await db.communityPartner.findUnique({ where: { id }, select: { logoKey: true } });
  if (!partner) return { error: "Partner not found." };
  await db.communityPartner.update({ where: { id }, data: { logoKey: null } });
  if (partner.logoKey) await deleteUpload(partner.logoKey);
  await audit(actor.id, "site.partner.logo.remove", id);
  revalidateSite();
  return { ok: true };
}

// ─────────────────────────── Resources tab ───────────────────────────

const resourceSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  category: z.string().trim().min(1, "Category is required.").max(60),
  description: optionalText(600),
  url: optionalUrl,
  phone: optionalText(40),
  address: optionalText(200),
  ownerId: z.string().trim().transform((v) => (v === "" ? null : v)),
  lastVerifiedAt: z.string().trim().optional(),
  order: orderField,
});

export async function saveResourceAction(id: string | null, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const actor = await actionModule("site");
  const parsed = resourceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const { lastVerifiedAt, ownerId, ...rest } = parsed.data;
  const verified = parseDateInput(lastVerifiedAt);
  if (lastVerifiedAt && !verified) return { fieldErrors: { lastVerifiedAt: "Enter a valid date." } };
  if (ownerId) {
    const owner = await db.user.findFirst({ where: { id: ownerId, role: { in: ["ADMIN", "MAIN_ADMIN"] } }, select: { id: true } });
    if (!owner) return { fieldErrors: { ownerId: "Owner must be an admin." } };
  }
  const isPublished = formData.get("isPublished") === "on";
  const data = { ...rest, ownerId, lastVerifiedAt: verified, isPublished };
  if (id) {
    await db.localResource.update({ where: { id }, data });
    await audit(actor.id, "site.resource.update", id, { name: data.name });
  } else {
    const row = await db.localResource.create({ data, select: { id: true } });
    await audit(actor.id, "site.resource.create", row.id, { name: data.name });
  }
  revalidateSite();
  return { ok: true, message: id ? "Resource saved." : "Resource added." };
}

/** One click: stamp today's date as the last verification. */
export async function markResourceVerifiedAction(id: string): Promise<ActionResult> {
  const actor = await actionModule("site");
  await db.localResource.update({ where: { id }, data: { lastVerifiedAt: new Date() } });
  await audit(actor.id, "site.resource.verify", id);
  revalidateSite();
  return { ok: true };
}

export async function deleteResourceAction(id: string): Promise<ActionResult> {
  const actor = await actionModule("site");
  await db.localResource.delete({ where: { id } }).catch(() => null);
  await audit(actor.id, "site.resource.delete", id);
  revalidateSite();
  return { ok: true };
}
