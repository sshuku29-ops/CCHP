"use server";

// Server actions for goals, projects and tasks.
// Every write checks authorization first (actionModule("projects") for admin
// writes; volunteers may only change status / comment on tasks assigned to them).

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actionModule, actionUser, AuthError } from "@/lib/auth/guards";
import { GOAL_STATUSES, PROJECT_STATUSES, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { parseDateInput } from "@/lib/dates";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { fieldErrorsFromZod, type ActionResult } from "@/lib/action-result";
import { canManageProjects, isAssignedTo } from "./queries";

// ─────────────────────────── Helpers ───────────────────────────

/** Re-render every page that shows goal/project/task data. */
function revalidateAll(extra: string[] = []) {
  for (const p of ["/dashboard", "/goals", "/projects", "/tasks", ...extra]) revalidatePath(p);
}

/** Turn a thrown AuthError into a friendly form error; rethrow everything else (incl. redirects). */
function authResult(e: unknown): ActionResult {
  if (e instanceof AuthError) return { error: e.message };
  throw e;
}

/** "YYYY-MM-DD" or empty → Date | null. Rejects garbage. */
const dateField = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = parseDateInput(v);
    if (!d) ctx.addIssue({ code: "custom", message: "Enter a valid date." });
    return d;
  });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : null));

/** Optional id from a <select>; "" means none. */
const optionalId = z
  .string()
  .optional()
  .transform((v) => (v ? v : null));

const TERM_RE = /^(Fall|Spring|Summer) (\d{4})$/;

/** Academic year for a term label: Fall 2025, Spring 2026 and Summer 2026 are all year 2025. */
function yearForTerm(term: string): number {
  const m = TERM_RE.exec(term);
  if (!m) return new Date().getFullYear();
  const y = Number(m[2]);
  return m[1] === "Fall" ? y : y - 1;
}

/** completedAt is set when a task becomes DONE and cleared when it leaves DONE. */
function completedAtFor(oldStatus: string, newStatus: string, current: Date | null): Date | null {
  if (newStatus === "DONE") return oldStatus === "DONE" && current ? current : new Date();
  return null;
}

// ───────────────────────────── Goals ───────────────────────────

const goalSchema = z.object({
  title: z.string().trim().min(3, "Give the goal a short title.").max(200),
  description: optionalText(4000),
  term: z.string().regex(TERM_RE, "Pick a term."),
  status: z.enum(GOAL_STATUSES),
  targetDate: dateField,
});

export async function createGoal(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let user;
  try {
    user = await actionModule("projects");
  } catch (e) {
    return authResult(e);
  }
  const parsed = goalSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const d = parsed.data;
  const goal = await db.goal.create({
    data: { ...d, year: yearForTerm(d.term), createdById: user.id },
  });
  await audit(user.id, "goal.create", goal.id);
  revalidateAll();
  redirect(`/goals/${goal.id}`);
}

export async function updateGoal(id: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let user;
  try {
    user = await actionModule("projects");
  } catch (e) {
    return authResult(e);
  }
  const parsed = goalSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const d = parsed.data;
  await db.goal.update({ where: { id }, data: { ...d, year: yearForTerm(d.term) } });
  await audit(user.id, "goal.update", id);
  revalidateAll([`/goals/${id}`]);
  return { ok: true, message: "Goal saved." };
}

/** One-click status change (Archive = DROPPED, Mark achieved = ACHIEVED, Reopen = ACTIVE). */
export async function setGoalStatus(id: string, status: string): Promise<ActionResult> {
  try {
    const user = await actionModule("projects");
    const s = z.enum(GOAL_STATUSES).parse(status);
    await db.goal.update({ where: { id }, data: { status: s } });
    await audit(user.id, "goal.status", id, { status: s });
    revalidateAll([`/goals/${id}`]);
    return { ok: true };
  } catch (e) {
    return authResult(e);
  }
}

// ──────────────────────────── Projects ─────────────────────────

const projectSchema = z.object({
  title: z.string().trim().min(3, "Give the project a short title.").max(200),
  description: optionalText(4000),
  goalId: optionalId,
  ownerId: optionalId,
  status: z.enum(PROJECT_STATUSES),
  startDate: dateField,
  dueDate: dateField,
  color: z
    .string()
    .optional()
    .transform((v) => (v && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null)),
});

export async function createProject(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let user;
  try {
    user = await actionModule("projects");
  } catch (e) {
    return authResult(e);
  }
  const parsed = projectSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const project = await db.project.create({ data: parsed.data });
  await audit(user.id, "project.create", project.id);
  revalidateAll();
  redirect(`/projects/${project.id}`);
}

export async function updateProject(id: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let user;
  try {
    user = await actionModule("projects");
  } catch (e) {
    return authResult(e);
  }
  const parsed = projectSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  await db.project.update({ where: { id }, data: parsed.data });
  await audit(user.id, "project.update", id);
  revalidateAll([`/projects/${id}`, `/projects/${id}/edit`]);
  return { ok: true, message: "Project saved." };
}

export async function setProjectStatus(id: string, status: string): Promise<ActionResult> {
  try {
    const user = await actionModule("projects");
    const s = z.enum(PROJECT_STATUSES).parse(status);
    await db.project.update({ where: { id }, data: { status: s } });
    await audit(user.id, "project.status", id, { status: s });
    revalidateAll([`/projects/${id}`]);
    return { ok: true };
  } catch (e) {
    return authResult(e);
  }
}

// ───────────────────────────── Tasks ───────────────────────────

const taskSchema = z.object({
  title: z.string().trim().min(2, "Give the task a title.").max(200),
  description: optionalText(8000),
  projectId: optionalId,
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  needsOwner: z.string().optional().transform((v) => v === "on" || v === "true"),
  startDate: dateField,
  dueDate: dateField,
});

/** Read the multi-checkbox list of assignee ids from the form. */
function assigneeIdsFrom(fd: FormData): string[] {
  const ids = fd.getAll("assigneeIds").map(String).filter(Boolean);
  return Array.from(new Set(ids));
}

/** Keep only ids that belong to active users (never trust the client). */
async function validAssignees(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const users = await db.user.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true } });
  return users.map((u) => u.id);
}

async function notifyAssigned(taskId: string, title: string, userIds: string[], actorId: string) {
  const targets = userIds.filter((id) => id !== actorId);
  if (targets.length === 0) return;
  await notify(targets, {
    type: "ASSIGNED",
    title: `You were assigned a task: ${title}`,
    href: `/tasks/${taskId}`,
  });
}

/** Full create form (/tasks/new). Redirects to the new task. */
export async function createTask(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let user;
  try {
    user = await actionModule("projects");
  } catch (e) {
    return authResult(e);
  }
  const parsed = taskSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const d = parsed.data;
  const assignees = await validAssignees(assigneeIdsFrom(fd));
  const task = await db.task.create({
    data: {
      ...d,
      // A task with assignees never "needs an owner".
      needsOwner: assignees.length === 0 ? d.needsOwner : false,
      completedAt: d.status === "DONE" ? new Date() : null,
      createdById: user.id,
      assignees: { create: assignees.map((userId) => ({ userId })) },
    },
  });
  await notifyAssigned(task.id, task.title, assignees, user.id);
  await audit(user.id, "task.create", task.id);
  revalidateAll(d.projectId ? [`/projects/${d.projectId}`] : []);
  redirect(`/tasks/${task.id}`);
}

/** Quick-add on the project page: just a title (+ optional due date). */
export async function quickAddTask(projectId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let user;
  try {
    user = await actionModule("projects");
  } catch (e) {
    return authResult(e);
  }
  const parsed = z
    .object({ title: z.string().trim().min(2, "Give the task a title.").max(200), dueDate: dateField })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) return { error: "Project not found." };
  const task = await db.task.create({
    data: { ...parsed.data, projectId, needsOwner: true, createdById: user.id },
  });
  await audit(user.id, "task.create", task.id);
  revalidateAll([`/projects/${projectId}`]);
  return { ok: true, message: "Task added." };
}

/**
 * Edit from the task detail page. Admins can change everything (including
 * assignees); volunteers may only change the status of their own tasks.
 */
export async function updateTask(id: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let user;
  try {
    user = await actionUser();
  } catch (e) {
    return authResult(e);
  }
  const existing = await db.task.findUnique({
    where: { id },
    include: { assignees: { select: { userId: true } } },
  });
  if (!existing) return { error: "Task not found." };

  if (!canManageProjects(user)) {
    // Volunteer path: only status, only on their own task.
    if (!existing.assignees.some((a) => a.userId === user.id)) return { error: "Not authorized." };
    const parsed = z.object({ status: z.enum(TASK_STATUSES) }).safeParse({ status: fd.get("status") });
    if (!parsed.success) return { fieldErrors: { status: "Pick a status." } };
    await db.task.update({
      where: { id },
      data: {
        status: parsed.data.status,
        completedAt: completedAtFor(existing.status, parsed.data.status, existing.completedAt),
      },
    });
    revalidateAll([`/tasks/${id}`, ...(existing.projectId ? [`/projects/${existing.projectId}`] : [])]);
    return { ok: true, message: "Status updated." };
  }

  const parsed = taskSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const d = parsed.data;
  const assignees = await validAssignees(assigneeIdsFrom(fd));
  const before = new Set(existing.assignees.map((a) => a.userId));
  const added = assignees.filter((uid) => !before.has(uid));

  await db.$transaction([
    db.taskAssignee.deleteMany({ where: { taskId: id, userId: { notIn: assignees } } }),
    ...added.map((userId) => db.taskAssignee.create({ data: { taskId: id, userId } })),
    db.task.update({
      where: { id },
      data: {
        ...d,
        needsOwner: assignees.length === 0 ? d.needsOwner : false,
        completedAt: completedAtFor(existing.status, d.status, existing.completedAt),
      },
    }),
  ]);
  await notifyAssigned(id, d.title, added, user.id);
  await audit(user.id, "task.update", id);
  const projectPaths = [existing.projectId, d.projectId].filter((p): p is string => !!p).map((p) => `/projects/${p}`);
  revalidateAll([`/tasks/${id}`, ...projectPaths]);
  return { ok: true, message: "Task saved." };
}

/** Used by the kanban board (drag-and-drop) and the status select fallback. */
export async function setTaskStatus(id: string, status: string): Promise<ActionResult> {
  try {
    const user = await actionUser();
    const s = z.enum(TASK_STATUSES).parse(status);
    const existing = await db.task.findUnique({ where: { id }, select: { status: true, completedAt: true, projectId: true } });
    if (!existing) return { error: "Task not found." };
    if (!canManageProjects(user) && !(await isAssignedTo(id, user.id))) throw new AuthError();
    await db.task.update({
      where: { id },
      data: { status: s, completedAt: completedAtFor(existing.status, s, existing.completedAt) },
    });
    await audit(user.id, "task.status", id, { status: s });
    revalidateAll([`/tasks/${id}`, ...(existing.projectId ? [`/projects/${existing.projectId}`] : [])]);
    return { ok: true };
  } catch (e) {
    return authResult(e);
  }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  try {
    const user = await actionUser();
    const existing = await db.task.findUnique({ where: { id }, select: { projectId: true, isPersonal: true, createdById: true } });
    if (!existing) return { error: "Task not found." };
    // Admins can delete any task; volunteers only their own personal tasks.
    const ownsPersonal = existing.isPersonal && existing.createdById === user.id;
    if (!canManageProjects(user) && !ownsPersonal) throw new AuthError();
    await db.task.delete({ where: { id } });
    await audit(user.id, "task.delete", id);
    revalidateAll(existing.projectId ? [`/projects/${existing.projectId}`] : []);
  } catch (e) {
    return authResult(e);
  }
  redirect("/tasks");
}

// ───────────────────────── Links & comments ────────────────────

const linkSchema = z.object({
  label: z.string().trim().min(1, "Give the link a label.").max(120),
  url: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => {
      try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    }, "Enter a full http(s) link."),
});

export async function addTaskLink(taskId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let user;
  try {
    user = await actionModule("projects");
  } catch (e) {
    return authResult(e);
  }
  const parsed = linkSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  await db.taskLink.create({ data: { taskId, ...parsed.data } });
  await audit(user.id, "task.link.add", taskId);
  revalidatePath(`/tasks/${taskId}`);
  return { ok: true, message: "Link added." };
}

export async function removeTaskLink(linkId: string): Promise<ActionResult> {
  try {
    const user = await actionModule("projects");
    const link = await db.taskLink.findUnique({ where: { id: linkId } });
    if (!link) return { error: "Link not found." };
    await db.taskLink.delete({ where: { id: linkId } });
    await audit(user.id, "task.link.remove", link.taskId);
    revalidatePath(`/tasks/${link.taskId}`);
    return { ok: true };
  } catch (e) {
    return authResult(e);
  }
}

/** Anyone who can see the task can comment: admins, or assignees. */
export async function addTaskComment(taskId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let user;
  try {
    user = await actionUser();
    if (!canManageProjects(user) && !(await isAssignedTo(taskId, user.id))) throw new AuthError();
  } catch (e) {
    return authResult(e);
  }
  const parsed = z
    .object({ body: z.string().trim().min(1, "Write a comment first.").max(4000) })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  await db.taskComment.create({ data: { taskId, authorId: user.id, body: parsed.data.body } });
  revalidatePath(`/tasks/${taskId}`);
  return { ok: true };
}

// ─────────────────── Personal tasks & claiming ────────────────

const personalTaskSchema = z.object({
  title: z.string().trim().min(2, "Give the task a title.").max(200),
  description: optionalText(8000),
  dueDate: dateField,
});

/**
 * "New task" on /tasks for anyone signed in. The task is private: it is
 * flagged isPersonal, assigned to its creator, and only they (and admins)
 * can see it.
 */
export async function createPersonalTask(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let user;
  try {
    user = await actionUser();
  } catch (e) {
    return authResult(e);
  }
  const parsed = personalTaskSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const d = parsed.data;
  const task = await db.task.create({
    data: {
      title: d.title,
      description: d.description,
      dueDate: d.dueDate,
      isPersonal: true,
      needsOwner: false,
      createdById: user.id,
      assignees: { create: [{ userId: user.id }] },
    },
  });
  await audit(user.id, "task.create.personal", task.id);
  revalidateAll();
  return { ok: true, message: "Task added to your list." };
}

/**
 * Claim an unclaimed task: the current user becomes its assignee and the
 * "needs owner" flag is cleared. Whoever created the task is told.
 */
export async function claimTask(id: string): Promise<ActionResult> {
  try {
    const user = await actionUser();
    const task = await db.task.findUnique({
      where: { id },
      select: { title: true, needsOwner: true, isPersonal: true, status: true, createdById: true, projectId: true, assignees: { select: { userId: true } } },
    });
    if (!task) return { error: "Task not found." };
    if (task.isPersonal) return { error: "Personal tasks can't be claimed." };
    if (task.status === "DONE") return { error: "That task is already done." };
    if (task.assignees.length > 0 || !task.needsOwner) return { error: "Someone already picked this task up." };
    await db.task.update({
      where: { id },
      data: { needsOwner: false, assignees: { create: [{ userId: user.id }] } },
    });
    if (task.createdById && task.createdById !== user.id) {
      await notify(task.createdById, {
        type: "ASSIGNED",
        title: `${user.firstName} ${user.lastName} claimed a task: ${task.title}`,
        href: `/tasks/${id}`,
      });
    }
    await audit(user.id, "task.claim", id);
    revalidateAll([`/tasks/${id}`, ...(task.projectId ? [`/projects/${task.projectId}`] : [])]);
    return { ok: true, message: "It's yours. The task is now in your list." };
  } catch (e) {
    return authResult(e);
  }
}

/** Admin: put a task back in the unclaimed pool (removes every assignee). */
export async function releaseTask(id: string): Promise<ActionResult> {
  try {
    const user = await actionModule("projects");
    const task = await db.task.findUnique({ where: { id }, select: { isPersonal: true, projectId: true } });
    if (!task) return { error: "Task not found." };
    if (task.isPersonal) return { error: "Personal tasks can't be released." };
    await db.$transaction([
      db.taskAssignee.deleteMany({ where: { taskId: id } }),
      db.task.update({ where: { id }, data: { needsOwner: true } }),
    ]);
    await audit(user.id, "task.release", id);
    revalidateAll([`/tasks/${id}`, ...(task.projectId ? [`/projects/${task.projectId}`] : [])]);
    return { ok: true, message: "Task released. Anyone can claim it now." };
  } catch (e) {
    return authResult(e);
  }
}
