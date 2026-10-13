"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionModule } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";
import { SESSION_TYPES } from "@/lib/constants";
import { academicYearForDate, parseDateInput, termForDate } from "@/lib/dates";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/action-result";
import { runImport, type ImportKind, type ImportResult } from "./import";

// ───────────────────────── Volunteer directory ─────────────────────────

const volunteerSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  email: z.string().trim().toLowerCase().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  graduationDate: z.string().optional(),
  hasVehicle: z.string().optional(),
});

/**
 * Admins may edit the directory fields only (spec §3). Role, username and
 * password are managed on the Main Admin users page, never here.
 */
export async function updateVolunteerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await actionModule("volunteers");
  const parsed = volunteerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const d = parsed.data;
  const email = d.email ? d.email : null;
  if (email && !z.string().email().safeParse(email).success) return { fieldErrors: { email: "Enter a valid email address." } };
  if (d.graduationDate && !parseDateInput(d.graduationDate)) return { fieldErrors: { graduationDate: "Enter a valid date." } };
  if (email) {
    const clash = await db.user.findFirst({ where: { email, NOT: { id: d.id } }, select: { id: true } });
    if (clash) return { fieldErrors: { email: "Another account already uses this email." } };
  }
  const exists = await db.user.findUnique({ where: { id: d.id }, select: { id: true } });
  if (!exists) return { error: "Volunteer not found." };
  await db.user.update({
    where: { id: d.id },
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      email,
      phone: d.phone ? d.phone : null,
      graduationDate: parseDateInput(d.graduationDate),
      hasVehicle: d.hasVehicle === "on" || d.hasVehicle === "true",
    },
  });
  await audit(admin.id, "volunteer.updated", d.id);
  revalidatePath("/volunteers");
  revalidatePath(`/volunteers/${d.id}`);
  return { ok: true, message: "Saved." };
}

// ───────────────────────── Session records ─────────────────────────

const sessionSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1, "Date is required."),
  type: z.enum(SESSION_TYPES),
  topic: z.string().trim().max(200).optional().or(z.literal("")),
  title: z.string().trim().max(200).optional().or(z.literal("")),
  participantCount: z.coerce.number().int("Must be a whole number.").min(0, "Cannot be negative.").max(10_000),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});

/** Reads the repeated material_label[] / material_url[] inputs from the form. */
function readMaterials(formData: FormData): { ok: { label: string; url: string }[]; error?: string } {
  const labels = formData.getAll("material_label").map(String);
  const urls = formData.getAll("material_url").map(String);
  const ok: { label: string; url: string }[] = [];
  for (let i = 0; i < Math.max(labels.length, urls.length); i++) {
    const label = (labels[i] ?? "").trim();
    const url = (urls[i] ?? "").trim();
    if (!label && !url) continue; // blank row
    if (!/^https?:\/\//i.test(url)) return { ok, error: `Material ${i + 1}: the link must start with http:// or https://.` };
    ok.push({ label: (label || url).slice(0, 120), url: url.slice(0, 1000) });
  }
  return { ok };
}

/** Create (no id) or update (with id) a session record. Term/year come from the date. */
export async function saveSessionAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await actionModule("records");
  const parsed = sessionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const d = parsed.data;
  const date = parseDateInput(d.date);
  if (!date) return { fieldErrors: { date: "Enter a valid date." } };
  const mats = readMaterials(formData);
  if (mats.error) return { error: mats.error };
  // Only keep volunteer ids that really exist (the checkbox list is built from users, but never trust the client).
  const requested = Array.from(new Set(formData.getAll("volunteerIds").map(String).filter(Boolean)));
  const validUsers = requested.length
    ? await db.user.findMany({ where: { id: { in: requested } }, select: { id: true } })
    : [];
  const volunteerIds = validUsers.map((u) => u.id);

  const local = new Date(date.getTime() + date.getTimezoneOffset() * 60_000);
  const base = {
    date,
    type: d.type,
    topic: d.topic || null,
    title: d.title || null,
    participantCount: d.participantCount,
    location: d.location || null,
    notes: d.notes || null,
    term: termForDate(local),
    year: academicYearForDate(local),
  };

  let id = d.id;
  if (id) {
    const exists = await db.sessionRecord.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return { error: "Session not found." };
    // Replace materials and volunteers wholesale — simplest to reason about.
    await db.$transaction([
      db.sessionMaterial.deleteMany({ where: { sessionId: id } }),
      db.sessionVolunteer.deleteMany({ where: { sessionId: id } }),
      db.sessionRecord.update({
        where: { id },
        data: {
          ...base,
          materials: { create: mats.ok },
          volunteers: { create: volunteerIds.map((userId) => ({ userId })) },
        },
      }),
    ]);
    await audit(admin.id, "session.updated", id);
  } else {
    const created = await db.sessionRecord.create({
      data: {
        ...base,
        materials: { create: mats.ok },
        volunteers: { create: volunteerIds.map((userId) => ({ userId })) },
      },
      select: { id: true },
    });
    id = created.id;
    await audit(admin.id, "session.created", id);
  }
  revalidatePath("/sessions");
  revalidatePath(`/sessions/${id}`);
  revalidatePath("/volunteers");
  redirect(`/sessions/${id}?saved=1`);
}

export async function deleteSessionAction(id: string) {
  const admin = await actionModule("records");
  await db.sessionRecord.delete({ where: { id } }).catch(() => {});
  await audit(admin.id, "session.deleted", id);
  revalidatePath("/sessions");
  revalidatePath("/volunteers");
  redirect("/sessions?deleted=1");
}

// ───────────────────────── CSV import ─────────────────────────

const MAX_CSV_BYTES = 2 * 1024 * 1024;

export type ImportActionState = { error?: string; result?: ImportResult } | null;

/** Parses the uploaded CSV and runs the chosen importer (or a dry run). */
export async function importCsvAction(_prev: ImportActionState, formData: FormData): Promise<ImportActionState> {
  const admin = await actionModule("volunteers");
  const kind = String(formData.get("kind") ?? "");
  if (!["volunteers", "hours", "sessions"].includes(kind)) return { error: "Pick which importer to run." };
  const dryRun = formData.get("dryRun") === "on";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to upload." };
  if (file.size > MAX_CSV_BYTES) return { error: "The file is larger than 2 MB. Split it into smaller files." };
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "csv") return { error: "Only .csv files are accepted (export the sheet as CSV first)." };

  const text = Buffer.from(await file.arrayBuffer()).toString("utf8");
  const rows = parseCsv(text);
  if (rows.length === 0) return { error: "The file has a header row but no data rows." };

  // Session imports need the records module as well; hours/sessions also touch other people's data,
  // so all three require the volunteers module (checked above) which only admins have.
  if (kind === "sessions") await actionModule("records");

  const result = await runImport(kind as ImportKind, rows, dryRun);
  if (!dryRun && result.inserted > 0) {
    await audit(admin.id, `import.${kind}`, undefined, { inserted: result.inserted, skipped: result.skipped.length });
    revalidatePath("/volunteers");
    revalidatePath("/sessions");
    revalidatePath("/reports-admin");
  }
  return { result };
}
