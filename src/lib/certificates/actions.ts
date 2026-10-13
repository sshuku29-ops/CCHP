"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionModule, AuthError } from "@/lib/auth/guards";
import type { CurrentUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { createDocumentFromBytes, deleteDocument } from "@/lib/documents";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/action-result";
import { buildCertificatePdf, certificateFileName } from "./pdf";
import { academicYearForTerm, canIssueCertificates, isTermLabel, listTermVolunteers, summarizeUserTerm } from "./queries";

/**
 * Issuing certificates. Only the Main Admin or the Executive Director may issue;
 * other admins with the "volunteers" module can look but the buttons are hidden
 * for them (and the actions below refuse anyway).
 */

/** Guard shared by every action here. Throws AuthError when not allowed. */
async function requireIssuer(): Promise<CurrentUser> {
  const user = await actionModule("volunteers");
  if (!canIssueCertificates(user)) throw new AuthError("Only the Main Admin or the Executive Director can issue certificates.");
  return user;
}

function authResult(e: unknown): ActionResult {
  if (e instanceof AuthError) return { error: e.message };
  throw e;
}

function revalidate() {
  revalidatePath("/certificates");
  revalidatePath("/hours");
}

/**
 * The shared pipeline: build the PDF, store it as a Document, upsert the
 * Certificate row (replacing any old document), notify the volunteer.
 */
async function issue(
  issuer: CurrentUser,
  input: { userId: string; term: string; hours: number; sessionsCount: number; manual: boolean; notes?: string | null },
) {
  const volunteer = await db.user.findUnique({ where: { id: input.userId }, select: { id: true, firstName: true, lastName: true } });
  if (!volunteer) return { error: "Volunteer not found." } satisfies ActionResult;
  const fullName = `${volunteer.firstName} ${volunteer.lastName}`.trim();
  const issuedAt = new Date();

  const bytes = await buildCertificatePdf({
    fullName,
    hours: input.hours,
    sessionsCount: input.sessionsCount,
    term: input.term,
    issuedAt,
    issuerName: `${issuer.firstName} ${issuer.lastName}`,
    // The signature line always carries the ED title; the Main Admin signs on the ED's behalf.
    issuerTitle: "Executive Director",
  });
  const document = await createDocumentFromBytes(bytes, {
    title: `Certificate of Volunteer Service — ${fullName} — ${input.term}`,
    fileName: certificateFileName(fullName, input.term),
    category: "CERTIFICATE",
    uploadedById: issuer.id,
  });

  const existing = await db.certificate.findFirst({ where: { userId: input.userId, term: input.term }, select: { id: true, documentId: true } });
  const data = {
    hours: input.hours,
    sessionsCount: input.sessionsCount,
    manual: input.manual,
    notes: input.notes ?? null,
    documentId: document.id,
    issuedById: issuer.id,
    issuedAt,
  };
  let certId: string;
  if (existing) {
    // Regenerate: point the row at the new file, then throw the old file away.
    await db.certificate.update({ where: { id: existing.id }, data });
    if (existing.documentId) await deleteDocument(existing.documentId);
    certId = existing.id;
  } else {
    const created = await db.certificate.create({
      data: { ...data, userId: input.userId, term: input.term, year: academicYearForTerm(input.term) },
      select: { id: true },
    });
    certId = created.id;
  }

  await notify(volunteer.id, {
    type: "INFO",
    title: existing ? `Your ${input.term} certificate was updated` : `Your ${input.term} volunteer certificate is ready`,
    body: `${input.hours} hours · ${input.sessionsCount} session${input.sessionsCount === 1 ? "" : "s"}. Download it from your hours page.`,
    href: "/hours",
  });
  await audit(issuer.id, existing ? "certificate.regenerate" : "certificate.issue", certId, {
    userId: input.userId,
    term: input.term,
    hours: input.hours,
    manual: input.manual,
  });
  return { ok: true, message: `${existing ? "Regenerated" : "Issued"} certificate for ${fullName}.` } satisfies ActionResult;
}

/** Generate (or regenerate) one computed certificate for a volunteer and term. */
export async function generateCertificate(userId: string, term: string): Promise<ActionResult> {
  try {
    const issuer = await requireIssuer();
    if (!isTermLabel(term)) return { error: "Pick a term." };
    const { hours, sessionsCount } = await summarizeUserTerm(userId, term);
    if (hours <= 0) return { error: "No hours logged for that term." };
    const res = await issue(issuer, { userId, term, hours, sessionsCount, manual: false });
    revalidate();
    return res;
  } catch (e) {
    return authResult(e);
  }
}

/** Generate a certificate for every volunteer with hours in the term who doesn't have one yet. */
export async function generateAllMissing(term: string): Promise<ActionResult> {
  try {
    const issuer = await requireIssuer();
    if (!isTermLabel(term)) return { error: "Pick a term." };
    const rows = (await listTermVolunteers(term)).filter((r) => !r.certificate && r.hours > 0);
    let n = 0;
    for (const r of rows) {
      const res = await issue(issuer, { userId: r.userId, term, hours: r.hours, sessionsCount: r.sessionsCount, manual: false });
      if (res?.ok) n++;
    }
    revalidate();
    return { ok: true, message: n === 0 ? "Nothing to generate — everyone already has a certificate." : `Issued ${n} certificate${n === 1 ? "" : "s"}.` };
  } catch (e) {
    return authResult(e);
  }
}

const manualSchema = z.object({
  userId: z.string().min(1, "Pick a volunteer."),
  term: z.string().refine(isTermLabel, "Pick a term."),
  hours: z.coerce.number({ message: "Enter the hours." }).min(0.25, "Minimum is 0.25 hours.").max(2000, "That is too many hours."),
  sessionsCount: z.coerce.number({ message: "Enter a whole number." }).int("Whole numbers only.").min(0).max(1000).default(0),
  notes: z.string().trim().max(1000, "Keep notes under 1000 characters.").optional().transform((v) => (v ? v : null)),
});

/** "Manual certificate" form: hours and sessions typed in by hand (e.g. for a past term). */
export async function createManualCertificate(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let issuer;
  try {
    issuer = await requireIssuer();
  } catch (e) {
    return authResult(e);
  }
  const parsed = manualSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const d = parsed.data;
  const res = await issue(issuer, { userId: d.userId, term: d.term, hours: d.hours, sessionsCount: d.sessionsCount, manual: true, notes: d.notes });
  revalidate();
  return res;
}
