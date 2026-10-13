"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionUser, actionModule, AuthError } from "@/lib/auth/guards";
import { SUBMISSION_TYPES } from "@/lib/constants";
import { parseDateInput } from "@/lib/dates";
import { isYouTubeUrl } from "@/lib/youtube";
import { validateUpload, storeUpload } from "@/lib/uploads";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/action-result";
import { canManageLms, lmsAdminUserIds, assignmentHref } from "./queries";

/**
 * Server actions for the LMS.
 *  - Course / module / resource / video / assignment management: admins with the "lms" module.
 *  - Module completion + assignment submission: any signed-in user, on published courses only.
 *  - Submission review: admins with the "lms" module.
 *
 * Multi-field forms return ActionResult (used with <ActionForm>). One-click actions
 * (move, delete, toggle) return nothing and throw on bad input.
 */

/** Re-render every page under /courses after a write. */
function revalidateCourses() {
  revalidatePath("/courses", "layout");
}

// ───────────────────────── Shared zod pieces ───────────────────

const idSchema = z.string().trim().min(1).max(64);
const titleSchema = z.string().trim().min(1, "Title is required.").max(200, "Keep the title under 200 characters.");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : null));
/** Optional "YYYY-MM-DD" from an <input type="date">; empty = null. */
const dateSchema = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = parseDateInput(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Invalid date." });
      return z.NEVER;
    }
    return d;
  });
const httpUrl = z
  .string()
  .trim()
  .url("Enter a full link starting with http:// or https://")
  .refine((u) => /^https?:\/\//i.test(u), "Links must start with http:// or https://");
const youtubeUrl = z
  .string()
  .trim()
  .refine((u) => isYouTubeUrl(u), "That does not look like a YouTube link.");

// ───────────────────────── Courses ─────────────────────────────

const courseSchema = z.object({
  title: titleSchema,
  description: optionalText(2000),
  isPublished: z.string().optional().transform((v) => v === "on"),
});

export async function createCourse(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await actionModule("lms");
  const parsed = courseSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const last = await db.course.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
  const course = await db.course.create({ data: { ...parsed.data, order: (last?.order ?? 0) + 1 } });
  await audit(user.id, "course.create", course.id);
  revalidateCourses();
  redirect(`/courses/${course.id}`);
}

export async function updateCourse(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await actionModule("lms");
  const parsed = courseSchema.extend({ courseId: idSchema }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const { courseId, ...data } = parsed.data;
  await db.course.update({ where: { id: courseId }, data });
  await audit(user.id, "course.update", courseId);
  revalidateCourses();
  return { ok: true, message: "Course saved." };
}

export async function deleteCourse(courseId: string) {
  const user = await actionModule("lms");
  await db.course.delete({ where: { id: courseId } });
  await audit(user.id, "course.delete", courseId);
  revalidateCourses();
  redirect("/courses");
}

// ───────────────────────── Modules ─────────────────────────────

const moduleSchema = z.object({
  title: titleSchema,
  summary: optionalText(500),
  instructions: optionalText(20000),
  dueDate: dateSchema,
});

export async function addModule(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await actionModule("lms");
  const parsed = moduleSchema.extend({ courseId: idSchema }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const { courseId, ...data } = parsed.data;
  const last = await db.courseModule.findFirst({ where: { courseId }, orderBy: { order: "desc" }, select: { order: true } });
  const mod = await db.courseModule.create({ data: { ...data, courseId, order: (last?.order ?? 0) + 1 } });
  await audit(user.id, "module.create", mod.id);
  revalidateCourses();
  return { ok: true, message: "Module added." };
}

export async function updateModule(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await actionModule("lms");
  const parsed = moduleSchema.extend({ moduleId: idSchema }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const { moduleId, ...data } = parsed.data;
  await db.courseModule.update({ where: { id: moduleId }, data });
  await audit(user.id, "module.update", moduleId);
  revalidateCourses();
  return { ok: true, message: "Module saved." };
}

/** Swap a module with its neighbour, then renumber 1..n so orders stay clean. */
export async function moveModule(moduleId: string, direction: "up" | "down") {
  await actionModule("lms");
  const mod = await db.courseModule.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!mod) throw new Error("Module not found.");
  const siblings = await db.courseModule.findMany({
    where: { courseId: mod.courseId },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  const i = siblings.findIndex((s) => s.id === moduleId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= siblings.length) return; // already at the edge
  [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
  await db.$transaction(
    siblings.map((s, idx) => db.courseModule.update({ where: { id: s.id }, data: { order: idx + 1 } })),
  );
  revalidateCourses();
}

export async function deleteModule(moduleId: string) {
  const user = await actionModule("lms");
  const mod = await db.courseModule.delete({ where: { id: moduleId }, select: { courseId: true } });
  await audit(user.id, "module.delete", moduleId);
  revalidateCourses();
  redirect(`/courses/${mod.courseId}`);
}

// ───────────────────────── Resources & videos ──────────────────

const resourceSchema = z.object({
  label: z.string().trim().min(1, "Label is required.").max(200),
  url: httpUrl,
});

export async function addResource(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await actionModule("lms");
  const parsed = resourceSchema.extend({ moduleId: idSchema }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const { moduleId, ...data } = parsed.data;
  const last = await db.moduleResource.findFirst({ where: { moduleId }, orderBy: { order: "desc" }, select: { order: true } });
  await db.moduleResource.create({ data: { ...data, moduleId, order: (last?.order ?? 0) + 1 } });
  revalidateCourses();
  return { ok: true, message: "Resource added." };
}

export async function updateResource(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await actionModule("lms");
  const parsed = resourceSchema.extend({ resourceId: idSchema }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const { resourceId, ...data } = parsed.data;
  await db.moduleResource.update({ where: { id: resourceId }, data });
  revalidateCourses();
  return { ok: true, message: "Resource saved." };
}

export async function deleteResource(resourceId: string) {
  await actionModule("lms");
  await db.moduleResource.delete({ where: { id: resourceId } });
  revalidateCourses();
}

const videoSchema = z.object({
  moduleId: idSchema,
  title: titleSchema,
  youtubeUrl,
});

export async function addVideo(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await actionModule("lms");
  const parsed = videoSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const { moduleId, ...data } = parsed.data;
  const last = await db.moduleVideo.findFirst({ where: { moduleId }, orderBy: { order: "desc" }, select: { order: true } });
  await db.moduleVideo.create({ data: { ...data, moduleId, order: (last?.order ?? 0) + 1 } });
  revalidateCourses();
  return { ok: true, message: "Video added." };
}

export async function deleteVideo(videoId: string) {
  await actionModule("lms");
  await db.moduleVideo.delete({ where: { id: videoId } });
  revalidateCourses();
}

// ───────────────────────── Assignments ─────────────────────────

const assignmentSchema = z.object({
  title: titleSchema,
  description: optionalText(5000),
  submissionType: z.enum(SUBMISSION_TYPES, { message: "Choose a submission type." }),
  dueDate: dateSchema,
});

export async function addAssignment(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await actionModule("lms");
  const parsed = assignmentSchema.extend({ moduleId: idSchema }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const { moduleId, ...data } = parsed.data;
  const last = await db.assignment.findFirst({ where: { moduleId }, orderBy: { order: "desc" }, select: { order: true } });
  await db.assignment.create({ data: { ...data, moduleId, order: (last?.order ?? 0) + 1 } });
  revalidateCourses();
  return { ok: true, message: "Assignment added." };
}

export async function updateAssignment(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await actionModule("lms");
  const parsed = assignmentSchema.extend({ assignmentId: idSchema }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const { assignmentId, ...data } = parsed.data;
  await db.assignment.update({ where: { id: assignmentId }, data });
  revalidateCourses();
  return { ok: true, message: "Assignment saved." };
}

export async function deleteAssignment(assignmentId: string) {
  await actionModule("lms");
  await db.assignment.delete({ where: { id: assignmentId } });
  revalidateCourses();
}

// ───────────────────────── Module completion ───────────────────

/** Mark / un-mark a module as complete for the signed-in user. */
export async function toggleModuleCompletion(moduleId: string) {
  const user = await actionUser();
  const mod = await db.courseModule.findUnique({
    where: { id: moduleId },
    select: { id: true, course: { select: { isPublished: true } } },
  });
  // Volunteers can only complete modules of published courses.
  if (!mod || (!mod.course.isPublished && !canManageLms(user))) throw new AuthError();
  const key = { moduleId_userId: { moduleId, userId: user.id } };
  const existing = await db.moduleCompletion.findUnique({ where: key });
  if (existing) await db.moduleCompletion.delete({ where: key });
  else await db.moduleCompletion.create({ data: { moduleId, userId: user.id } });
  revalidateCourses();
}

// ───────────────────────── Submissions ─────────────────────────

/**
 * Create a new submission (append-only: re-submitting creates a new row).
 * Must be called from a <form> with a file input so FormData carries the File.
 */
export async function submitAssignment(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await actionUser();
  const parsed = z
    .object({
      assignmentId: idSchema,
      text: optionalText(20000),
      videoUrl: z
        .string()
        .trim()
        .optional()
        .transform((v) => (v ? v : null)),
    })
    .safeParse({ assignmentId: fd.get("assignmentId"), text: fd.get("text"), videoUrl: fd.get("videoUrl") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const { assignmentId, text, videoUrl } = parsed.data;

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: { module: { select: { id: true, title: true, courseId: true, course: { select: { isPublished: true, title: true } } } } },
  });
  if (!assignment) return { error: "Assignment not found." };
  if (!assignment.module.course.isPublished && !canManageLms(user)) return { error: "This course is not published yet." };

  const type = assignment.submissionType;
  const fileEntry = fd.get("file");
  const file = fileEntry instanceof File && fileEntry.size > 0 && fileEntry.name ? fileEntry : null;

  // What each submission type requires.
  const fieldErrors: Record<string, string> = {};
  if (type === "TEXT" && !text) fieldErrors.text = "Please write your response.";
  if (type === "VIDEO_LINK" && !videoUrl) fieldErrors.videoUrl = "Paste your YouTube link.";
  if (type === "FILE" && !file) fieldErrors.file = "Please choose a file.";
  if (type === "ANY" && !text && !videoUrl && !file) fieldErrors.text = "Add text, a video link, or a file.";
  if (videoUrl && !isYouTubeUrl(videoUrl)) fieldErrors.videoUrl = "That does not look like a YouTube link.";
  if (file) {
    const problem = validateUpload(file);
    if (problem) fieldErrors.file = problem;
  }
  // Ignore fields the type does not accept (e.g. a file on a TEXT assignment).
  const keepText = type === "TEXT" || type === "ANY";
  const keepVideo = type === "VIDEO_LINK" || type === "ANY";
  const keepFile = type === "FILE" || type === "ANY";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const stored = keepFile && file ? await storeUpload(file) : null;
  const submission = await db.submission.create({
    data: {
      assignmentId,
      userId: user.id,
      text: keepText ? text : null,
      videoUrl: keepVideo ? videoUrl : null,
      fileName: stored?.name ?? null,
      fileKey: stored?.key ?? null,
      fileSize: stored?.size ?? null,
    },
  });
  await audit(user.id, "submission.create", submission.id);

  // Tell every LMS admin there is something new to review.
  const href = assignmentHref(assignment.module.courseId, assignment.module.id, assignmentId);
  await notify(await lmsAdminUserIds(), {
    type: "SUBMISSION",
    title: `New submission: ${assignment.title}`,
    body: `${user.firstName} ${user.lastName} submitted "${assignment.title}" (${assignment.module.course.title}).`,
    href,
  });
  revalidateCourses();
  return { ok: true, message: "Submitted. Thank you!" };
}

const reviewSchema = z.object({
  submissionId: idSchema,
  status: z.enum(["REVIEWED", "NEEDS_REVISION"], { message: "Choose a status." }),
  feedback: optionalText(5000),
});

/** Admin review: set status + feedback, record the reviewer, and notify the volunteer. */
export async function reviewSubmission(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const reviewer = await actionModule("lms");
  const parsed = reviewSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const { submissionId, status, feedback } = parsed.data;
  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: { select: { id: true, title: true, module: { select: { id: true, courseId: true } } } } },
  });
  if (!submission) return { error: "Submission not found." };
  await db.submission.update({
    where: { id: submissionId },
    data: { status, feedback, reviewedById: reviewer.id, reviewedAt: new Date() },
  });
  await audit(reviewer.id, "submission.review", submissionId, { status });
  const { assignment } = submission;
  await notify(submission.userId, {
    type: "SUBMISSION",
    title: status === "REVIEWED" ? `Reviewed: ${assignment.title}` : `Revision requested: ${assignment.title}`,
    body: feedback ?? undefined,
    href: assignmentHref(assignment.module.courseId, assignment.module.id, assignment.id),
  });
  revalidateCourses();
  return { ok: true, message: "Review saved and the volunteer has been notified." };
}
