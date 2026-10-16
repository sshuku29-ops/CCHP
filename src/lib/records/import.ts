import "server-only";
import { z } from "zod";
import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { HOURS_TYPES, SESSION_TYPES } from "@/lib/constants";
import { academicYearForDate, termForDate } from "@/lib/dates";

/**
 * CSV importers used once, when migrating from the old Google Sheets.
 * Each importer takes the parsed rows (from parseCsv in @/lib/csv), validates
 * them one by one with zod, and either inserts the valid rows or — in dry-run
 * mode — just reports what it WOULD do. Row numbers in the results count the
 * header as line 1, so "row 2" is the first data line in the sheet.
 *
 * Formats are documented for admins in docs/MIGRATION.md. Keep both in sync.
 */

export type ImportKind = "volunteers" | "hours" | "sessions";

export type ImportSkip = { row: number; reason: string };

export type ImportResult = {
  kind: ImportKind;
  dryRun: boolean;
  totalRows: number;
  inserted: number;
  skipped: ImportSkip[];
  /** Volunteer importer only: accounts created with their one-time temporary password. */
  created?: { row: number; name: string; email: string; username: string; tempPassword: string }[];
};

// ───────────────────────── small shared helpers ─────────────────────────

/** Accepts "YYYY-MM-DD" or "M/D/YYYY" (Google Sheets default) → UTC midnight. */
export function parseFlexibleDate(raw: string): Date | null {
  const s = raw.trim();
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (iso) [y, m, d] = [+iso[1], +iso[2], +iso[3]];
  else if (us) [m, d, y] = [+us[1], +us[2], +us[3]];
  else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(date.getTime()) || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date;
}

const zDate = z
  .string()
  .trim()
  .min(1, "date is required")
  .transform((s, ctx) => {
    const d = parseFlexibleDate(s);
    if (!d) ctx.addIssue({ code: "custom", message: `date "${s}" is not YYYY-MM-DD or M/D/YYYY` });
    return d as Date;
  });

const zEmail = z.string().trim().toLowerCase().email("email is not valid").max(200);

/** Yes/no cell → boolean. Accepts yes/no, true/false, y/n, 1/0, blank = false. */
function parseYesNo(raw: string): boolean | null {
  const s = raw.trim().toLowerCase();
  if (s === "" || ["no", "n", "false", "0"].includes(s)) return false;
  if (["yes", "y", "true", "1"].includes(s)) return true;
  return null;
}

/** "formal" / "informal" / "prep" / "other" (or the full constant) → HOURS_TYPES value. */
function parseHoursType(raw: string): (typeof HOURS_TYPES)[number] | null {
  const s = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if ((HOURS_TYPES as readonly string[]).includes(s)) return s as (typeof HOURS_TYPES)[number];
  if (s.startsWith("FORMAL")) return "FORMAL_SESSION";
  if (s.startsWith("INFORMAL")) return "INFORMAL_SESSION";
  if (s.startsWith("PREP") || s.startsWith("RESEARCH")) return "PREP";
  if (s === "" || s.startsWith("OTHER")) return "OTHER";
  return null;
}

/** Zod issues → one readable sentence for the results table. */
function issuesToReason(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((i) => (i.path.length ? `${String(i.path[0])}: ${i.message}` : i.message)).join("; ");
}

/** Term/year from a UTC-midnight date, using the calendar day (not the local-time day). */
function termAndYear(date: Date) {
  const local = new Date(date.getTime() + date.getTimezoneOffset() * 60_000);
  return { term: termForDate(local), year: academicYearForDate(local) };
}

/** 12 random characters, guaranteed to contain letters and digits (passes passwordProblems). */
export function generateTempPassword(): string {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"; // no i/l/o/I/O to avoid confusion
  const digits = "23456789";
  const all = letters + digits;
  const chars: string[] = [];
  for (let i = 0; i < 10; i++) chars.push(all[randomInt(all.length)]);
  chars.push(letters[randomInt(letters.length)]);
  chars.push(digits[randomInt(digits.length)]);
  // shuffle so the guaranteed letter/digit are not always at the end
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/** "first.last" in lowercase ASCII; appends 2, 3, … if that username is already taken. */
async function uniqueUsername(first: string, last: string, reserved: Set<string>): Promise<string> {
  const clean = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  const base = `${clean(first)}.${clean(last)}`.replace(/^\.|\.$/g, "") || "volunteer";
  let candidate = base;
  let n = 2;
  while (reserved.has(candidate) || (await db.user.findUnique({ where: { username: candidate }, select: { id: true } }))) {
    candidate = `${base}${n++}`;
  }
  reserved.add(candidate);
  return candidate;
}

// ───────────────────────── (a) Volunteer list ─────────────────────────

export const VOLUNTEER_COLUMNS = ["first_name", "last_name", "email", "phone", "graduation_date", "has_vehicle"] as const;

const volunteerRowSchema = z.object({
  first_name: z.string().trim().min(1, "first_name is required").max(80),
  last_name: z.string().trim().min(1, "last_name is required").max(80),
  email: zEmail,
  phone: z.string().trim().max(40).optional().default(""),
  graduation_date: z
    .string()
    .trim()
    .optional()
    .default("")
    .transform((s, ctx) => {
      if (!s) return null;
      const d = parseFlexibleDate(s);
      if (!d) ctx.addIssue({ code: "custom", message: `graduation_date "${s}" is not YYYY-MM-DD or M/D/YYYY` });
      return d;
    }),
  has_vehicle: z
    .string()
    .optional()
    .default("")
    .transform((s, ctx) => {
      const v = parseYesNo(s);
      if (v === null) ctx.addIssue({ code: "custom", message: `has_vehicle "${s}" should be yes or no` });
      return v ?? false;
    }),
});

export async function importVolunteers(rows: Record<string, string>[], dryRun: boolean): Promise<ImportResult> {
  const result: ImportResult = { kind: "volunteers", dryRun, totalRows: rows.length, inserted: 0, skipped: [], created: [] };
  const seenEmails = new Set<string>();
  const reservedUsernames = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    const rowNo = i + 2;
    const parsed = volunteerRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      result.skipped.push({ row: rowNo, reason: issuesToReason(parsed.error.issues) });
      continue;
    }
    const r = parsed.data;
    if (seenEmails.has(r.email)) {
      result.skipped.push({ row: rowNo, reason: `email ${r.email} appears earlier in this file` });
      continue;
    }
    seenEmails.add(r.email);
    const existing = await db.user.findUnique({ where: { email: r.email }, select: { id: true } });
    if (existing) {
      result.skipped.push({ row: rowNo, reason: `email ${r.email} already has an account` });
      continue;
    }
    const username = await uniqueUsername(r.first_name, r.last_name, reservedUsernames);
    const tempPassword = generateTempPassword();
    if (!dryRun) {
      await db.user.create({
        data: {
          username,
          email: r.email,
          passwordHash: await hashPassword(tempPassword),
          role: "VOLUNTEER",
          firstName: r.first_name,
          lastName: r.last_name,
          phone: r.phone || null,
          graduationDate: r.graduation_date,
          hasVehicle: r.has_vehicle,
          mustChangePassword: true,
        },
      });
    }
    result.inserted++;
    result.created!.push({
      row: rowNo,
      name: `${r.first_name} ${r.last_name}`,
      email: r.email,
      username,
      tempPassword: dryRun ? "(generated on real import)" : tempPassword,
    });
  }
  return result;
}

// ───────────────────────── (b) Hours log ─────────────────────────

export const HOURS_COLUMNS = ["email", "date", "hours", "type", "notes"] as const;

const hoursRowSchema = z.object({
  email: zEmail,
  date: zDate,
  hours: z
    .string()
    .trim()
    .min(1, "hours is required")
    .transform((s, ctx) => {
      const n = Number(s);
      if (!Number.isFinite(n) || n <= 0 || n > 24) ctx.addIssue({ code: "custom", message: `hours "${s}" must be a number between 0 and 24` });
      return n;
    }),
  type: z
    .string()
    .optional()
    .default("")
    .transform((s, ctx) => {
      const t = parseHoursType(s);
      if (!t) ctx.addIssue({ code: "custom", message: `type "${s}" should be formal, informal, prep or other` });
      return t ?? "OTHER";
    }),
  notes: z.string().trim().max(2000).optional().default(""),
});

export async function importHoursLog(rows: Record<string, string>[], dryRun: boolean): Promise<ImportResult> {
  const result: ImportResult = { kind: "hours", dryRun, totalRows: rows.length, inserted: 0, skipped: [] };
  // Look every email up once instead of once per row.
  const emailToId = new Map<string, string>();
  const users = await db.user.findMany({ where: { email: { not: null } }, select: { id: true, email: true } });
  for (const u of users) if (u.email) emailToId.set(u.email.toLowerCase(), u.id);

  for (let i = 0; i < rows.length; i++) {
    const rowNo = i + 2;
    const parsed = hoursRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      result.skipped.push({ row: rowNo, reason: issuesToReason(parsed.error.issues) });
      continue;
    }
    const r = parsed.data;
    const userId = emailToId.get(r.email);
    if (!userId) {
      result.skipped.push({ row: rowNo, reason: `no account with email ${r.email} (import the volunteer list first)` });
      continue;
    }
    if (!dryRun) {
      await db.hoursLog.create({
        data: { userId, date: r.date, hours: r.hours, type: r.type, notes: r.notes || null },
      });
    }
    result.inserted++;
  }
  return result;
}

// ───────────────────────── (c) Record keeping sheet (sessions) ─────────────────────────

export const SESSION_COLUMNS = ["date", "type", "topic", "participants", "volunteer_emails", "notes", "materials"] as const;

const sessionRowSchema = z.object({
  date: zDate,
  type: z
    .string()
    .trim()
    .toUpperCase()
    .transform((s, ctx) => {
      if (!(SESSION_TYPES as readonly string[]).includes(s)) ctx.addIssue({ code: "custom", message: `type "${s}" must be FORMAL or INFORMAL` });
      return s as (typeof SESSION_TYPES)[number];
    }),
  topic: z.string().trim().max(200).optional().default(""),
  participants: z
    .string()
    .trim()
    .optional()
    .default("")
    .transform((s, ctx) => {
      if (!s) return 0;
      const n = Number(s);
      if (!Number.isInteger(n) || n < 0 || n > 10_000) ctx.addIssue({ code: "custom", message: `participants "${s}" must be a whole number` });
      return Number.isInteger(n) ? n : 0;
    }),
  volunteer_emails: z.string().optional().default(""),
  notes: z.string().trim().max(5000).optional().default(""),
  materials: z.string().optional().default(""),
});

/** "label|url;label|url" → [{label,url}]. A bare URL with no label uses the URL as its label. */
export function parseMaterialsCell(raw: string): { ok: { label: string; url: string }[]; bad: string[] } {
  const ok: { label: string; url: string }[] = [];
  const bad: string[] = [];
  for (const part of raw.split(";")) {
    const p = part.trim();
    if (!p) continue;
    const [a, b] = p.split("|").map((s) => s.trim());
    const url = b ?? a;
    const label = b ? a : a;
    if (!/^https?:\/\//i.test(url)) {
      bad.push(p);
      continue;
    }
    ok.push({ label: label.slice(0, 120) || url, url: url.slice(0, 1000) });
  }
  return { ok, bad };
}

export async function importSessions(rows: Record<string, string>[], dryRun: boolean): Promise<ImportResult> {
  const result: ImportResult = { kind: "sessions", dryRun, totalRows: rows.length, inserted: 0, skipped: [] };
  const emailToId = new Map<string, string>();
  const users = await db.user.findMany({ where: { email: { not: null } }, select: { id: true, email: true } });
  for (const u of users) if (u.email) emailToId.set(u.email.toLowerCase(), u.id);

  for (let i = 0; i < rows.length; i++) {
    const rowNo = i + 2;
    const parsed = sessionRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      result.skipped.push({ row: rowNo, reason: issuesToReason(parsed.error.issues) });
      continue;
    }
    const r = parsed.data;
    // Volunteers: every email must match an account, otherwise the row is skipped
    // so the admin can fix the sheet and re-run (nothing is half-imported).
    const emails = r.volunteer_emails
      .split(";")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const unknown = emails.filter((e) => !emailToId.has(e));
    if (unknown.length) {
      result.skipped.push({ row: rowNo, reason: `unknown volunteer email(s): ${unknown.join(", ")}` });
      continue;
    }
    const mats = parseMaterialsCell(r.materials);
    if (mats.bad.length) {
      result.skipped.push({ row: rowNo, reason: `materials must be label|https://… separated by ";" — bad: ${mats.bad.join(", ")}` });
      continue;
    }
    const { term, year } = termAndYear(r.date);
    const userIds = Array.from(new Set(emails.map((e) => emailToId.get(e)!)));
    if (!dryRun) {
      await db.sessionRecord.create({
        data: {
          date: r.date,
          type: r.type,
          topic: r.topic || null,
          title: r.topic || null,
          participantCount: r.participants,
          notes: r.notes || null,
          term,
          year,
          materials: { create: mats.ok },
          volunteers: { create: userIds.map((userId) => ({ userId })) },
        },
      });
    }
    result.inserted++;
  }
  return result;
}

export async function runImport(kind: ImportKind, rows: Record<string, string>[], dryRun: boolean) {
  if (kind === "volunteers") return importVolunteers(rows, dryRun);
  if (kind === "hours") return importHoursLog(rows, dryRun);
  return importSessions(rows, dryRun);
}
