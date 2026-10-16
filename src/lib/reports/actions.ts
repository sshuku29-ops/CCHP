"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionModule } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { academicYearForDate, academicYearLabel } from "@/lib/dates";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/action-result";
import { computeYearMetrics } from "./metrics";

const zYear = z.coerce.number().int().min(2000).max(2100);

/** Reports live at /reports-admin/[year]; the public page is /reports/[year]. */
function revalidateReport(year: number) {
  revalidatePath("/reports-admin");
  revalidatePath(`/reports-admin/${year}`);
  revalidatePath(`/reports-admin/${year}/print`);
  revalidatePath("/reports");
  revalidatePath(`/reports/${year}`);
}

/** "New report": creates an empty draft for the chosen academic year, then opens it. */
export async function createReportAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await actionModule("reports");
  const parsed = zYear.safeParse(formData.get("year") ?? academicYearForDate(new Date()));
  if (!parsed.success) return { fieldErrors: { year: "Enter a 4-digit year." } };
  const year = parsed.data;
  const existing = await db.annualReport.findUnique({ where: { year }, select: { id: true } });
  if (existing) return { fieldErrors: { year: `A report for ${academicYearLabel(year)} already exists.` } };
  await db.annualReport.create({
    data: { year, title: `CCHP Annual Report ${academicYearLabel(year)}`, status: "DRAFT" },
  });
  await audit(admin.id, "report.created", String(year));
  revalidateReport(year);
  redirect(`/reports-admin/${year}`);
}

const reportSchema = z.object({
  year: zYear,
  title: z.string().trim().min(1, "Title is required.").max(200),
  summary: z.string().trim().max(2000).optional().or(z.literal("")),
  narrative: z.string().max(50_000).optional().or(z.literal("")),
  highlights: z.string().max(10_000).optional().or(z.literal("")),
});

/** Reads the repeated quote_text[] / quote_attribution[] inputs. Blank rows are dropped. */
function readQuotes(formData: FormData) {
  const texts = formData.getAll("quote_text").map(String);
  const attributions = formData.getAll("quote_attribution").map(String);
  const quotes: { text: string; attribution: string }[] = [];
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i].trim().slice(0, 1000);
    const attribution = (attributions[i] ?? "").trim().slice(0, 120);
    if (!text) continue;
    quotes.push({ text, attribution: attribution || "Session participant" });
  }
  return quotes;
}

/** Save draft — never changes the publish status. */
export async function saveReportAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await actionModule("reports");
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const d = parsed.data;
  const exists = await db.annualReport.findUnique({ where: { year: d.year }, select: { id: true } });
  if (!exists) return { error: "Report not found." };
  const highlights = (d.highlights ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
  await db.annualReport.update({
    where: { year: d.year },
    data: {
      title: d.title,
      summary: d.summary || null,
      narrative: d.narrative || null,
      highlights: JSON.stringify(highlights),
      quotes: JSON.stringify(readQuotes(formData)),
    },
  });
  await audit(admin.id, "report.saved", String(d.year));
  revalidateReport(d.year);
  return { ok: true, message: "Draft saved." };
}

/** Publish: freeze the live metrics into metricsSnapshot so the public page is stable. */
export async function publishReportAction(year: number) {
  const admin = await actionModule("reports");
  const exists = await db.annualReport.findUnique({ where: { year }, select: { id: true } });
  if (!exists) return { error: "Report not found." };
  const metrics = await computeYearMetrics(year);
  await db.annualReport.update({
    where: { year },
    data: { status: "PUBLISHED", publishedAt: new Date(), metricsSnapshot: JSON.stringify(metrics) },
  });
  await audit(admin.id, "report.published", String(year));
  revalidateReport(year);
  return { ok: true };
}

export async function unpublishReportAction(year: number) {
  const admin = await actionModule("reports");
  await db.annualReport.update({ where: { year }, data: { status: "DRAFT", publishedAt: null } }).catch(() => {});
  await audit(admin.id, "report.unpublished", String(year));
  revalidateReport(year);
  return { ok: true };
}

export async function deleteReportAction(year: number) {
  const admin = await actionModule("reports");
  await db.annualReport.delete({ where: { year } }).catch(() => {});
  await audit(admin.id, "report.deleted", String(year));
  revalidateReport(year);
  redirect("/reports-admin?deleted=1");
}
