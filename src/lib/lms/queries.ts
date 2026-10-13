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
          _count: { select: { assignments: true } },
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
      resources: { orderBy: { order: "asc" } },
      videos: { orderBy: { order: "asc" } },
      assignments: {
        orderBy: { order: "asc" },
        include: {
          // Only the current user's latest submission (append-only history, newest first).
          submissions: { where: { userId: user.id }, orderBy: { submittedAt: "desc" }, take: 1 },
        },
      },
      completions: { where: { userId: user.id }, select: { completedAt: true } },
    },
  });
  if (!mod) return null;
  return {
    ...mod,
    completed: mod.completions.length > 0,
    assignments: mod.assignments.map((a) => ({ ...a, latestSubmission: a.submissions[0] ?? null })),
  };
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
