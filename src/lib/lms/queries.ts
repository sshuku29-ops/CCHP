import "server-only";
import { db } from "@/lib/db";
import { canAccessModule } from "@/lib/auth/guards";
import type { CurrentUser } from "@/lib/auth/session";
import { safeJsonParse } from "@/lib/utils";

/**
 * Read-side helpers for the LMS (training courses).
 *
 * Rules enforced here (and again in actions.ts):
 *  - Volunteers only see PUBLISHED courses.
 *  - Admins with the "lms" module see everything and can manage courses.
 *  - Completions and submissions are always filtered to the current user,
 *    except in the admin review views.
 */

type UserLike = Pick<CurrentUser, "id" | "role" | "allowedModules">;

/** True when this user may create/edit courses and review submissions. */
export function canManageLms(user: UserLike) {
  return canAccessModule(user, "lms");
}

/** Course visibility filter: volunteers (and admins without "lms") only get published courses. */
function visibleCourseWhere(user: UserLike) {
  return canManageLms(user) ? {} : { isPublished: true };
}

/** "Still upcoming" = due today or later. Due dates are UTC midnight, so allow a day of slack. */
function isUpcoming(due: Date | null) {
  return !!due && due.getTime() >= Date.now() - 86_400_000;
}

// ───────────────────────── Course list ─────────────────────────

export async function listCourses(user: UserLike) {
  const courses = await db.course.findMany({
    where: visibleCourseWhere(user),
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      modules: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          completions: { where: { userId: user.id }, select: { userId: true } },
          assignments: {
            select: {
              id: true,
              title: true,
              dueDate: true,
              submissions: { where: { userId: user.id }, select: { id: true }, take: 1 },
            },
          },
        },
      },
    },
  });

  return courses.map((c) => {
    const moduleCount = c.modules.length;
    const completedCount = c.modules.filter((m) => m.completions.length > 0).length;
    // Next due = the earliest upcoming assignment this user has not submitted yet.
    const nextDue =
      c.modules
        .flatMap((m) => m.assignments.map((a) => ({ ...a, moduleId: m.id })))
        .filter((a) => isUpcoming(a.dueDate) && a.submissions.length === 0)
        .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())[0] ?? null;
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      isPublished: c.isPublished,
      moduleCount,
      completedCount,
      nextDue: nextDue ? { id: nextDue.id, title: nextDue.title, dueDate: nextDue.dueDate!, moduleId: nextDue.moduleId } : null,
    };
  });
}

// ───────────────────────── Course overview ─────────────────────

export async function getCourse(courseId: string, user: UserLike) {
  const course = await db.course.findFirst({
    where: { id: courseId, ...visibleCourseWhere(user) },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { assignments: true, quizzes: true } },
          completions: { where: { userId: user.id }, select: { completedAt: true } },
        },
      },
    },
  });
  if (!course) return null;
  return {
    ...course,
    modules: course.modules.map((m) => ({
      id: m.id,
      title: m.title,
      summary: m.summary,
      order: m.order,
      dueDate: m.dueDate,
      assignmentCount: m._count.assignments,
      quizCount: m._count.quizzes,
      completed: m.completions.length > 0,
    })),
  };
}

// ───────────────────────── Module page ─────────────────────────

export async function getModule(courseId: string, moduleId: string, user: UserLike) {
  const mod = await db.courseModule.findFirst({
    where: { id: moduleId, courseId, course: visibleCourseWhere(user) },
    include: {
      course: { select: { id: true, title: true, isPublished: true } },
      // Each resource points at a library page, an uploaded document, or (legacy) an external URL.
      resources: {
        orderBy: { order: "asc" },
        include: {
          page: { select: { id: true, slug: true, title: true, isPublished: true } },
          document: { select: { id: true, title: true, fileName: true, fileKey: true, kind: true, mimeType: true } },
        },
      },
      videos: { orderBy: { order: "asc" } },
      assignments: {
        orderBy: { order: "asc" },
        include: {
          // Only the current user's latest submission (append-only history, newest first).
          submissions: { where: { userId: user.id }, orderBy: { submittedAt: "desc" }, take: 1 },
        },
      },
      completions: { where: { userId: user.id }, select: { completedAt: true } },
      quizzes: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: {
          _count: { select: { questions: true } },
          // Only the current user's attempts; we reduce them to a "best" below.
          attempts: { where: { userId: user.id }, select: { percent: true, passed: true, createdAt: true } },
        },
      },
    },
  });
  if (!mod) return null;
  const quizzes = mod.quizzes.map((q) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    passPercent: q.passPercent,
    questionCount: q._count.questions,
    attemptCount: q.attempts.length,
    best: bestAttempt(q.attempts),
  }));
  return {
    ...mod,
    quizzes,
    quizzesPassed: quizzes.filter((q) => q.best?.passed).length,
    completed: mod.completions.length > 0,
    assignments: mod.assignments.map((a) => ({ ...a, latestSubmission: a.submissions[0] ?? null })),
  };
}

/** The highest-scoring attempt in a list (ties: the earliest one). Null when there are none. */
function bestAttempt<T extends { percent: number; passed: boolean; createdAt: Date }>(attempts: T[]): T | null {
  let best: T | null = null;
  for (const a of attempts) if (!best || a.percent > best.percent) best = a;
  return best;
}

// ───────────────────────── Quizzes ─────────────────────────────

/** Parse the JSON `options` column into a string array (never throws). */
export function parseOptions(raw: string): string[] {
  const parsed = safeJsonParse<unknown>(raw, []);
  return Array.isArray(parsed) ? parsed.map(String) : [];
}

/** Parse the JSON `answers` column: one chosen option index per question, null if unanswered. */
export function parseAnswers(raw: string): (number | null)[] {
  const parsed = safeJsonParse<unknown>(raw, []);
  return Array.isArray(parsed) ? parsed.map((v) => (typeof v === "number" ? v : null)) : [];
}

/**
 * Quiz as seen by the person TAKING it. The correct answers and explanations are
 * deliberately NOT selected here, so they can never reach the browser before grading.
 */
export async function getQuizForTaking(courseId: string, moduleId: string, quizId: string, user: UserLike) {
  const quiz = await db.quiz.findFirst({
    where: { id: quizId, moduleId, module: { courseId, course: visibleCourseWhere(user) } },
    select: {
      id: true,
      title: true,
      description: true,
      passPercent: true,
      module: { select: { id: true, title: true, course: { select: { id: true, title: true } } } },
      questions: { orderBy: { order: "asc" }, select: { id: true, prompt: true, options: true } },
      // This user's own history, newest first.
      attempts: { where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, percent: true, passed: true, score: true, total: true, createdAt: true } },
    },
  });
  if (!quiz) return null;
  return {
    ...quiz,
    questions: quiz.questions.map((q) => ({ ...q, options: parseOptions(q.options) })),
    best: bestAttempt(quiz.attempts),
  };
}

/**
 * One finished attempt with the full answer key, for the review screen.
 * Only the person who made the attempt can load it (filtered by userId).
 */
export async function getQuizAttemptReview(quizId: string, attemptId: string, user: UserLike) {
  const attempt = await db.quizAttempt.findFirst({
    where: { id: attemptId, quizId, userId: user.id },
    include: {
      quiz: { select: { id: true, title: true, passPercent: true, questions: { orderBy: { order: "asc" } } } },
    },
  });
  if (!attempt) return null;
  const answers = parseAnswers(attempt.answers);
  return {
    ...attempt,
    answers,
    questions: attempt.quiz.questions.map((q, i) => ({
      id: q.id,
      prompt: q.prompt,
      options: parseOptions(q.options),
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      chosenIndex: answers[i] ?? null,
    })),
  };
}

/** Full quiz including correct answers — for the admin question editor only. */
export async function getQuizForEditing(courseId: string, moduleId: string, quizId: string) {
  const quiz = await db.quiz.findFirst({
    where: { id: quizId, moduleId, module: { courseId } },
    include: {
      module: { select: { id: true, title: true, course: { select: { id: true, title: true } } } },
      questions: { orderBy: { order: "asc" } },
      _count: { select: { attempts: true } },
    },
  });
  if (!quiz) return null;
  return { ...quiz, questions: quiz.questions.map((q) => ({ ...q, options: parseOptions(q.options) })) };
}

/**
 * Admin results: one row per volunteer with their best attempt and how many tries they made.
 * Sorted by last name (never by score — no leaderboards).
 */
export async function getQuizResults(courseId: string, moduleId: string, quizId: string) {
  const quiz = await db.quiz.findFirst({
    where: { id: quizId, moduleId, module: { courseId } },
    include: {
      module: { select: { id: true, title: true, course: { select: { id: true, title: true } } } },
      _count: { select: { questions: true } },
      attempts: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });
  if (!quiz) return null;
  const byUser = new Map<string, { user: (typeof quiz.attempts)[number]["user"]; attempts: typeof quiz.attempts }>();
  for (const a of quiz.attempts) {
    const row = byUser.get(a.userId) ?? { user: a.user, attempts: [] };
    row.attempts.push(a);
    byUser.set(a.userId, row);
  }
  const rows = [...byUser.values()]
    .map((r) => ({
      user: r.user,
      attemptCount: r.attempts.length,
      best: bestAttempt(r.attempts)!,
      lastAttemptAt: r.attempts[r.attempts.length - 1].createdAt,
    }))
    .sort((a, b) => a.user.lastName.localeCompare(b.user.lastName) || a.user.firstName.localeCompare(b.user.firstName));
  return { id: quiz.id, title: quiz.title, passPercent: quiz.passPercent, questionCount: quiz._count.questions, module: quiz.module, rows };
}

/** Builds the canonical URL of a quiz page (taking). */
export function quizHref(courseId: string, moduleId: string, quizId: string) {
  return `/courses/${courseId}/modules/${moduleId}/quizzes/${quizId}`;
}

export type ModuleView = NonNullable<Awaited<ReturnType<typeof getModule>>>;

// ───────────────────────── Assignment page ─────────────────────

const submissionInclude = {
  user: { select: { id: true, firstName: true, lastName: true } },
  reviewedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

export async function getAssignment(courseId: string, moduleId: string, assignmentId: string, user: UserLike) {
  const assignment = await db.assignment.findFirst({
    where: { id: assignmentId, moduleId, module: { courseId, course: visibleCourseWhere(user) } },
    include: {
      module: { select: { id: true, title: true, course: { select: { id: true, title: true } } } },
    },
  });
  if (!assignment) return null;

  // The current user's own history, newest first.
  const mySubmissions = await db.submission.findMany({
    where: { assignmentId, userId: user.id },
    orderBy: { submittedAt: "desc" },
    include: submissionInclude,
  });

  // Admin reviewers also get every volunteer's submissions.
  const allSubmissions = canManageLms(user)
    ? await db.submission.findMany({
        where: { assignmentId },
        orderBy: { submittedAt: "desc" },
        include: submissionInclude,
      })
    : [];

  return { ...assignment, mySubmissions, allSubmissions };
}

export type SubmissionRow = NonNullable<Awaited<ReturnType<typeof getAssignment>>>["mySubmissions"][number];

// ───────────────────────── Review queue (admins) ───────────────

export async function listSubmissionsForReview(status?: string) {
  return db.submission.findMany({
    where: status ? { status } : {},
    orderBy: { submittedAt: "desc" },
    include: {
      ...submissionInclude,
      assignment: {
        select: {
          id: true,
          title: true,
          module: { select: { id: true, title: true, course: { select: { id: true, title: true } } } },
        },
      },
    },
  });
}

/** Ids of every active admin who may review submissions (module "lms"). Used for notifications. */
export async function lmsAdminUserIds(): Promise<string[]> {
  const admins = await db.user.findMany({
    where: { role: { in: ["ADMIN", "MAIN_ADMIN"] }, isActive: true },
    select: { id: true, role: true, allowedModules: true },
  });
  return admins
    .filter((a) => {
      if (a.role === "MAIN_ADMIN") return true;
      const scoped = safeJsonParse<string[] | null>(a.allowedModules, null);
      return !scoped || scoped.includes("lms");
    })
    .map((a) => a.id);
}

/** Builds the canonical URL of an assignment page. */
export function assignmentHref(courseId: string, moduleId: string, assignmentId: string) {
  return `/courses/${courseId}/modules/${moduleId}/assignments/${assignmentId}`;
}
