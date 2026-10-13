"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionModule, actionMainAdmin } from "@/lib/auth/guards";
import { rateLimit, clientIpKey } from "@/lib/auth/rate-limit";
import { audit } from "@/lib/audit";
import { parseDateInput } from "@/lib/dates";
import { isYouTubeUrl } from "@/lib/youtube";
import { fieldErrorsFromZod } from "@/lib/action-result";
import { CYCLE_TYPES, QUESTION_TYPES, APPLICATION_STATUSES, VIDEO_REVIEW_MODES } from "@/lib/constants";
import { formValues, slugify, isCycleOpenNow, type FormResult } from "./helpers";

// Every form field is re-read from FormData, so one small helper keeps it tidy.
const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

function revalidateCycle(cycleId: string) {
  revalidatePath("/recruitment");
  revalidatePath(`/recruitment/${cycleId}`, "layout");
  revalidatePath("/apply", "layout");
}

// ═══════════════════════ Public: submit an application ═══════════════════════

const MIN_SECONDS_ON_FORM = 5;

/**
 * Handles the public /apply/[slug] form. No login. Protected by:
 *   1. a honeypot field ("website") that real people never see or fill in,
 *   2. a minimum-time check (the form embeds the time it was rendered),
 *   3. a per-IP rate limit (5 submissions per hour),
 *   4. one application per email address per cycle.
 */
export async function submitApplicationAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const slug = str(fd, "slug");
  const values = formValues(fd);
  // Never echo the anti-spam fields back into the form.
  delete values.website;
  delete values.ts;

  // 1. Honeypot: bots fill every field. Pretend it worked and drop it.
  if (str(fd, "website").trim() !== "") redirect(`/apply/${encodeURIComponent(slug)}/thanks`);

  // 2. Minimum time on the form.
  const renderedAt = Number(str(fd, "ts"));
  if (!Number.isFinite(renderedAt) || Date.now() - renderedAt < MIN_SECONDS_ON_FORM * 1000) {
    return { error: "That was quick! Please take a moment to look over your answers, then submit again.", values };
  }

  // 3. Rate limit by (hashed) IP.
  const ipKey = await clientIpKey();
  const limit = await rateLimit({ key: `apply:${ipKey}`, limit: 5, windowSeconds: 3600 });
  if (!limit.ok) return { error: "Too many submissions from this connection. Please try again in an hour.", values };

  const cycle = await db.recruitmentCycle.findUnique({
    where: { slug },
    include: { questions: { orderBy: [{ order: "asc" }, { id: "asc" }] } },
  });
  if (!cycle || !isCycleOpenNow(cycle)) return { error: "This application is no longer open.", values };

  // Validate the fixed fields.
  const base = z
    .object({
      firstName: z.string().trim().min(1, "Enter your first name.").max(80, "Too long."),
      lastName: z.string().trim().min(1, "Enter your last name.").max(80, "Too long."),
      email: z.email("Enter a valid email address.").max(200, "Too long."),
      phone: z.string().trim().max(40, "Too long.").optional(),
      affiliation: z.string().trim().min(1, "This field is required.").max(120, "Too long."),
    })
    .safeParse({
      firstName: str(fd, "firstName"),
      lastName: str(fd, "lastName"),
      email: str(fd, "email").trim().toLowerCase(),
      phone: str(fd, "phone"),
      affiliation: str(fd, "affiliation"),
    });
  const fieldErrors: Record<string, string> = base.success ? {} : fieldErrorsFromZod(base.error.issues);

  // Validate each question's answer by its type.
  const answers: { questionId: string; text: string | null; videoUrl: string | null }[] = [];
  for (const q of cycle.questions) {
    const key = `q_${q.id}`;
    const raw = str(fd, key).trim();
    if (!raw) {
      if (q.required) fieldErrors[key] = "This question is required.";
      continue;
    }
    if (q.type === "VIDEO_LINK") {
      if (!isYouTubeUrl(raw)) {
        fieldErrors[key] = "Paste a YouTube link (for example https://youtu.be/… or https://www.youtube.com/watch?v=…).";
        continue;
      }
      answers.push({ questionId: q.id, text: null, videoUrl: raw });
    } else {
      const max = q.type === "SHORT_TEXT" ? 300 : 2000;
      if (raw.length > max) {
        fieldErrors[key] = `Please keep this under ${max} characters (currently ${raw.length}).`;
        continue;
      }
      answers.push({ questionId: q.id, text: raw, videoUrl: null });
    }
  }
  if (!base.success || Object.keys(fieldErrors).length > 0) {
    return { error: "Please fix the highlighted fields.", fieldErrors, values };
  }

  // 4. One application per email per cycle.
  const data = base.data;
  const duplicate = await db.application.findFirst({ where: { cycleId: cycle.id, email: data.email }, select: { id: true } });
  if (duplicate) {
    return {
      error: "We already have an application from this email address for this cycle. If you need to change something, email the CCHP team and we will sort it out.",
      fieldErrors: { email: "Already applied with this email." },
      values,
    };
  }

  const app = await db.application.create({
    data: {
      cycleId: cycle.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || null,
      affiliation: data.affiliation,
      answers: { create: answers },
    },
    select: { id: true },
  });
  await audit(null, "application.submitted", app.id, { cycleId: cycle.id });
  revalidateCycle(cycle.id);
  redirect(`/apply/${encodeURIComponent(slug)}/thanks`);
}

// ═══════════════════════ Admin: cycles ═══════════════════════

const cycleSchema = z.object({
  name: z.string().trim().min(2, "Give the cycle a name.").max(120, "Too long."),
  type: z.enum(CYCLE_TYPES, { error: "Pick an application type." }),
  description: z.string().trim().max(2000, "Too long.").optional(),
  videoReviewMode: z.enum(VIDEO_REVIEW_MODES, { error: "Pick a video review mode." }),
});

// "Opens on" / "Closes on" as typed into <input type="date"> ("" = not set).
const dateWindowSchema = z.object({
  opensAt: z.string().optional(),
  closesAt: z.string().optional(),
});

/** Make a slug unique by appending -2, -3, … when needed. */
async function uniqueSlug(base: string, ignoreCycleId?: string) {
  let slug = base;
  for (let n = 2; n < 1000; n++) {
    const clash = await db.recruitmentCycle.findUnique({ where: { slug }, select: { id: true } });
    if (!clash || clash.id === ignoreCycleId) return slug;
    slug = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

function parseDates(opensAt?: string, closesAt?: string): { opensAt: Date | null; closesAt: Date | null } | { error: string } {
  const o = parseDateInput(opensAt);
  const c = parseDateInput(closesAt);
  if (opensAt && !o) return { error: "Invalid opening date." };
  if (closesAt && !c) return { error: "Invalid closing date." };
  if (o && c && c < o) return { error: "The closing date must be on or after the opening date." };
  return { opensAt: o, closesAt: c };
}

export async function createCycleAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const user = await actionModule("recruitment");
  const values = formValues(fd);
  const parsed = cycleSchema.extend(dateWindowSchema.shape).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues), values };
  const dates = parseDates(parsed.data.opensAt, parsed.data.closesAt);
  if ("error" in dates) return { fieldErrors: { closesAt: dates.error }, values };

  const slug = await uniqueSlug(slugify(parsed.data.name));
  const cycle = await db.recruitmentCycle.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      slug,
      description: parsed.data.description || null,
      opensAt: dates.opensAt,
      closesAt: dates.closesAt,
      videoReviewMode: parsed.data.videoReviewMode,
      isOpen: false,
      // Every new cycle starts with a sensible default rubric. Admins can edit it.
      criteria: {
        create: [
          { name: "Motivation", description: "Genuine interest in the mission and the work.", maxScore: 5, order: 1 },
          { name: "Communication", description: "Clear, plain-language writing.", maxScore: 5, order: 2 },
          { name: "Reliability", description: "Evidence of follow-through and commitment.", maxScore: 5, order: 3 },
        ],
      },
    },
    select: { id: true },
  });
  await audit(user.id, "cycle.created", cycle.id);
  revalidateCycle(cycle.id);
  redirect(`/recruitment/${cycle.id}/questions`);
}

export async function updateCycleAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const user = await actionModule("recruitment");
  const values = formValues(fd);
  const cycleId = str(fd, "cycleId");
  const parsed = cycleSchema
    .extend({ slug: z.string().trim().min(2, "Slug is too short.").max(60, "Slug is too long.") })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues), values };

  const existing = await db.recruitmentCycle.findUnique({ where: { id: cycleId }, select: { id: true } });
  if (!existing) return { error: "Cycle not found.", values };

  const wantedSlug = slugify(parsed.data.slug);
  const slug = await uniqueSlug(wantedSlug, cycleId);
  if (slug !== wantedSlug) return { fieldErrors: { slug: `"${wantedSlug}" is already used by another cycle.` }, values };

  await db.recruitmentCycle.update({
    where: { id: cycleId },
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      slug,
      description: parsed.data.description || null,
      videoReviewMode: parsed.data.videoReviewMode,
    },
  });
  await audit(user.id, "cycle.updated", cycleId);
  revalidateCycle(cycleId);
  return { ok: true, message: "Cycle saved." };
}

/** One-click Open/Close toggle. */
export async function toggleCycleOpenAction(cycleId: string) {
  const user = await actionModule("recruitment");
  const cycle = await db.recruitmentCycle.findUnique({ where: { id: cycleId }, select: { isOpen: true } });
  if (!cycle) return { error: "Cycle not found." };
  await db.recruitmentCycle.update({ where: { id: cycleId }, data: { isOpen: !cycle.isOpen } });
  await audit(user.id, cycle.isOpen ? "cycle.closed" : "cycle.opened", cycleId);
  revalidateCycle(cycleId);
  return { ok: true };
}

/**
 * Explicit "Open applications now" / "Close applications now" buttons on the
 * cycle page. Same effect as the toggle, but the button says what it does, so
 * two admins clicking at once cannot flip it back and forth by accident.
 */
export async function setCycleOpenAction(cycleId: string, isOpen: boolean) {
  const user = await actionModule("recruitment");
  const cycle = await db.recruitmentCycle.findUnique({ where: { id: cycleId }, select: { isOpen: true } });
  if (!cycle) return { error: "Cycle not found." };
  if (cycle.isOpen !== isOpen) {
    await db.recruitmentCycle.update({ where: { id: cycleId }, data: { isOpen } });
    await audit(user.id, isOpen ? "cycle.opened" : "cycle.closed", cycleId);
  }
  revalidateCycle(cycleId);
  return { ok: true };
}

/**
 * The inline deadline form on the cycle page: "Opens on" / "Closes on".
 * Ticking "Leave open until I close it manually" submits an empty closesAt,
 * which clears the deadline. Dates only narrow the window — the manual
 * switch (isOpen) still has to be on for the form to accept applications.
 */
export async function updateCycleDatesAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const user = await actionModule("recruitment");
  const values = formValues(fd);
  const cycleId = str(fd, "cycleId");
  const parsed = dateWindowSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues), values };
  const dates = parseDates(parsed.data.opensAt, parsed.data.closesAt);
  if ("error" in dates) return { fieldErrors: { closesAt: dates.error }, values };

  const existing = await db.recruitmentCycle.findUnique({ where: { id: cycleId }, select: { id: true } });
  if (!existing) return { error: "Cycle not found.", values };

  await db.recruitmentCycle.update({ where: { id: cycleId }, data: { opensAt: dates.opensAt, closesAt: dates.closesAt } });
  await audit(user.id, "cycle.dates", cycleId, { opensAt: dates.opensAt, closesAt: dates.closesAt });
  revalidateCycle(cycleId);
  return { ok: true, message: dates.closesAt ? "Deadline saved." : "Saved — no deadline, open until you close it." };
}

/** Delete a cycle. Only allowed while it has no applications. */
export async function deleteCycleAction(cycleId: string) {
  const user = await actionModule("recruitment");
  const count = await db.application.count({ where: { cycleId } });
  if (count > 0) return { error: "This cycle has applications and cannot be deleted." };
  await db.recruitmentCycle.delete({ where: { id: cycleId } });
  await audit(user.id, "cycle.deleted", cycleId);
  revalidateCycle(cycleId);
  redirect("/recruitment");
}

// ═══════════════════════ Admin: questions ═══════════════════════

const questionSchema = z.object({
  cycleId: z.string().min(1),
  prompt: z.string().trim().min(3, "Write the question.").max(500, "Too long."),
  helpText: z.string().trim().max(500, "Too long.").optional(),
  type: z.enum(QUESTION_TYPES, { error: "Pick a question type." }),
  required: z.string().optional(), // checkbox: "on" or missing
});

/** Rewrite `order` as 1..n for a cycle's questions after an insert/move/delete. */
async function renumberQuestions(cycleId: string, ids?: string[]) {
  const list = ids ?? (await db.applicationQuestion.findMany({ where: { cycleId }, orderBy: [{ order: "asc" }, { id: "asc" }], select: { id: true } })).map((q) => q.id);
  await db.$transaction(list.map((id, i) => db.applicationQuestion.update({ where: { id }, data: { order: i + 1 } })));
}

export async function addQuestionAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const user = await actionModule("recruitment");
  const values = formValues(fd);
  const parsed = questionSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues), values };
  const { cycleId, prompt, helpText, type, required } = parsed.data;
  const last = await db.applicationQuestion.aggregate({ where: { cycleId }, _max: { order: true } });
  await db.applicationQuestion.create({
    data: { cycleId, prompt, helpText: helpText || null, type, required: required === "on", order: (last._max.order ?? 0) + 1 },
  });
  await audit(user.id, "question.added", cycleId);
  revalidateCycle(cycleId);
  return { ok: true, message: "Question added." };
}

export async function updateQuestionAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const user = await actionModule("recruitment");
  const values = formValues(fd);
  const id = str(fd, "id");
  const parsed = questionSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues), values };
  const { cycleId, prompt, helpText, type, required } = parsed.data;
  const q = await db.applicationQuestion.findFirst({ where: { id, cycleId }, select: { id: true } });
  if (!q) return { error: "Question not found.", values };
  await db.applicationQuestion.update({ where: { id }, data: { prompt, helpText: helpText || null, type, required: required === "on" } });
  await audit(user.id, "question.updated", id);
  revalidateCycle(cycleId);
  redirect(`/recruitment/${cycleId}/questions`);
}

export async function deleteQuestionAction(id: string) {
  const user = await actionModule("recruitment");
  const q = await db.applicationQuestion.findUnique({ where: { id }, select: { cycleId: true } });
  if (!q) return { error: "Question not found." };
  await db.applicationQuestion.delete({ where: { id } }); // answers cascade
  await renumberQuestions(q.cycleId);
  await audit(user.id, "question.deleted", id);
  revalidateCycle(q.cycleId);
  return { ok: true };
}

export async function moveQuestionAction(id: string, direction: "up" | "down") {
  await actionModule("recruitment");
  const q = await db.applicationQuestion.findUnique({ where: { id }, select: { cycleId: true } });
  if (!q) return { error: "Question not found." };
  const ids = (await db.applicationQuestion.findMany({ where: { cycleId: q.cycleId }, orderBy: [{ order: "asc" }, { id: "asc" }], select: { id: true } })).map((x) => x.id);
  const i = ids.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return { ok: true }; // already at the edge
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await renumberQuestions(q.cycleId, ids);
  revalidateCycle(q.cycleId);
  return { ok: true };
}

// ═══════════════════════ Admin: rubric criteria ═══════════════════════

const criterionSchema = z.object({
  cycleId: z.string().min(1),
  name: z.string().trim().min(2, "Name the criterion.").max(80, "Too long."),
  description: z.string().trim().max(500, "Too long.").optional(),
  maxScore: z.coerce.number().int("Whole numbers only.").min(1, "At least 1.").max(10, "At most 10."),
});

async function renumberCriteria(cycleId: string, ids?: string[]) {
  const list = ids ?? (await db.rubricCriterion.findMany({ where: { cycleId }, orderBy: [{ order: "asc" }, { id: "asc" }], select: { id: true } })).map((c) => c.id);
  await db.$transaction(list.map((id, i) => db.rubricCriterion.update({ where: { id }, data: { order: i + 1 } })));
}

export async function addCriterionAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const user = await actionModule("recruitment");
  const values = formValues(fd);
  const parsed = criterionSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues), values };
  const { cycleId, name, description, maxScore } = parsed.data;
  const last = await db.rubricCriterion.aggregate({ where: { cycleId }, _max: { order: true } });
  await db.rubricCriterion.create({ data: { cycleId, name, description: description || null, maxScore, order: (last._max.order ?? 0) + 1 } });
  await audit(user.id, "criterion.added", cycleId);
  revalidateCycle(cycleId);
  return { ok: true, message: "Criterion added." };
}

export async function updateCriterionAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const user = await actionModule("recruitment");
  const values = formValues(fd);
  const id = str(fd, "id");
  const parsed = criterionSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues), values };
  const { cycleId, name, description, maxScore } = parsed.data;
  const c = await db.rubricCriterion.findFirst({ where: { id, cycleId }, select: { id: true } });
  if (!c) return { error: "Criterion not found.", values };
  // Lowering maxScore below an existing score would make old scores invalid; clamp them.
  await db.$transaction([
    db.rubricCriterion.update({ where: { id }, data: { name, description: description || null, maxScore } }),
    db.applicationScore.updateMany({ where: { criterionId: id, score: { gt: maxScore } }, data: { score: maxScore } }),
  ]);
  await audit(user.id, "criterion.updated", id);
  revalidateCycle(cycleId);
  redirect(`/recruitment/${cycleId}/rubric`);
}

export async function deleteCriterionAction(id: string) {
  const user = await actionModule("recruitment");
  const c = await db.rubricCriterion.findUnique({ where: { id }, select: { cycleId: true } });
  if (!c) return { error: "Criterion not found." };
  await db.rubricCriterion.delete({ where: { id } }); // scores cascade
  await renumberCriteria(c.cycleId);
  await audit(user.id, "criterion.deleted", id);
  revalidateCycle(c.cycleId);
  return { ok: true };
}

export async function moveCriterionAction(id: string, direction: "up" | "down") {
  await actionModule("recruitment");
  const c = await db.rubricCriterion.findUnique({ where: { id }, select: { cycleId: true } });
  if (!c) return { error: "Criterion not found." };
  const ids = (await db.rubricCriterion.findMany({ where: { cycleId: c.cycleId }, orderBy: [{ order: "asc" }, { id: "asc" }], select: { id: true } })).map((x) => x.id);
  const i = ids.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return { ok: true };
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await renumberCriteria(c.cycleId, ids);
  revalidateCycle(c.cycleId);
  return { ok: true };
}

// ═══════════════════════ Admin: decisions on the ranked list ═══════════════════════

export async function setApplicationStatusAction(applicationId: string, status: string) {
  const user = await actionModule("recruitment");
  const parsed = z.enum(APPLICATION_STATUSES).safeParse(status);
  if (!parsed.success) return { error: "Unknown status." };
  const app = await db.application.findUnique({ where: { id: applicationId }, select: { cycleId: true } });
  if (!app) return { error: "Application not found." };
  await db.application.update({ where: { id: applicationId }, data: { status: parsed.data } });
  await audit(user.id, "application.status", applicationId, { status: parsed.data });
  revalidateCycle(app.cycleId);
  return { ok: true };
}

export async function setApplicationFlagAction(applicationId: string, flagged: boolean) {
  await actionModule("recruitment");
  const app = await db.application.findUnique({ where: { id: applicationId }, select: { cycleId: true } });
  if (!app) return { error: "Application not found." };
  await db.application.update({ where: { id: applicationId }, data: { flaggedForInterview: Boolean(flagged) } });
  revalidateCycle(app.cycleId);
  return { ok: true };
}

/** Main Admin only. Answers, scores and notes cascade. */
export async function deleteApplicationAction(applicationId: string) {
  const user = await actionMainAdmin();
  const app = await db.application.findUnique({ where: { id: applicationId }, select: { cycleId: true } });
  if (!app) return { error: "Application not found." };
  await db.application.delete({ where: { id: applicationId } });
  await audit(user.id, "application.deleted", applicationId);
  revalidateCycle(app.cycleId);
  redirect(`/recruitment/${app.cycleId}`);
}

// ═══════════════════════ Admin: anonymized scoring ═══════════════════════

/**
 * Saves the current reviewer's scores (one per criterion, "score_<criterionId>")
 * and private note. Partial saves are allowed — unscored criteria are left
 * untouched, so a reviewer can come back later.
 */
export async function saveReviewAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  const user = await actionModule("recruitment");
  const values = formValues(fd);
  const applicationId = str(fd, "applicationId");
  const app = await db.application.findUnique({
    where: { id: applicationId },
    select: { cycleId: true, cycle: { select: { criteria: { select: { id: true, maxScore: true } } } } },
  });
  if (!app) return { error: "Application not found.", values };

  const note = str(fd, "note").trim();
  if (note.length > 4000) return { fieldErrors: { note: "Please keep your note under 4000 characters." }, values };

  const writes = [];
  let saved = 0;
  for (const c of app.cycle.criteria) {
    const raw = str(fd, `score_${c.id}`);
    if (raw === "") continue; // not scored (yet)
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > c.maxScore) return { error: "One of the scores is out of range.", values };
    saved++;
    writes.push(
      db.applicationScore.upsert({
        where: { applicationId_reviewerId_criterionId: { applicationId, reviewerId: user.id, criterionId: c.id } },
        create: { applicationId, reviewerId: user.id, criterionId: c.id, score: n },
        update: { score: n },
      }),
    );
  }
  if (note) {
    writes.push(
      db.applicationReviewNote.upsert({
        where: { applicationId_reviewerId: { applicationId, reviewerId: user.id } },
        create: { applicationId, reviewerId: user.id, body: note },
        update: { body: note },
      }),
    );
  } else {
    writes.push(db.applicationReviewNote.deleteMany({ where: { applicationId, reviewerId: user.id } }));
  }
  await db.$transaction(writes);
  revalidateCycle(app.cycleId);
  const complete = saved === app.cycle.criteria.length && saved > 0;
  return { ok: true, message: complete ? "Scores saved — all criteria scored." : "Saved. You can finish scoring later.", values };
}
