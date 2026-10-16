import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { canAccessModule } from "@/lib/auth/guards";
import type { CurrentUser } from "@/lib/auth/session";
import {
  byDueDate,
  countCompletedPerWeek,
  isDueThisWeek,
  isTaskOverdue,
  mergeSummaries,
  summarizeTasks,
  termStartDate,
  type ProgressSummary,
} from "./progress";

// ───────────────────────── Shared shapes ─────────────────────────

/** Can this user manage goals/projects/tasks (vs. only see their own tasks)? */
export function canManageProjects(user: Pick<CurrentUser, "role" | "allowedModules">) {
  return canAccessModule(user, "projects");
}

/** Columns every task view needs. No PII — just names. */
export const taskRowSelect = {
  id: true,
  title: true,
  status: true,
  priority: true,
  needsOwner: true,
  isPersonal: true,
  createdById: true,
  startDate: true,
  dueDate: true,
  completedAt: true,
  createdAt: true,
  sortOrder: true,
  project: { select: { id: true, title: true, color: true } },
  assignees: { select: { user: { select: { id: true, firstName: true, lastName: true, photoKey: true } } } },
} satisfies Prisma.TaskSelect;

export type TaskRow = Prisma.TaskGetPayload<{ select: typeof taskRowSelect }>;

export type UserOption = { id: string; firstName: string; lastName: string; role: string };

/** Active users for assignee pickers / filters (names only). */
export async function listActiveUsers(): Promise<UserOption[]> {
  return db.user.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}

// ───────────────────────────── Goals ─────────────────────────────

const goalInclude = {
  createdBy: { select: { firstName: true, lastName: true } },
  projects: {
    select: {
      id: true,
      title: true,
      status: true,
      color: true,
      dueDate: true,
      tasks: { select: { status: true } },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.GoalInclude;

type GoalWithProjects = Prisma.GoalGetPayload<{ include: typeof goalInclude }>;

export type GoalListItem = Omit<GoalWithProjects, "projects"> & {
  projects: (Omit<GoalWithProjects["projects"][number], "tasks"> & { progress: ProgressSummary })[];
  progress: ProgressSummary;
};

function withGoalProgress(goal: GoalWithProjects): GoalListItem {
  const projects = goal.projects.map(({ tasks, ...p }) => ({ ...p, progress: summarizeTasks(tasks) }));
  return { ...goal, projects, progress: mergeSummaries(projects.map((p) => p.progress)) };
}

/** Goals, optionally for one term, with rolled-up task progress. */
export async function listGoals(opts: { term?: string } = {}): Promise<GoalListItem[]> {
  const goals = await db.goal.findMany({
    where: opts.term ? { term: opts.term } : {},
    include: goalInclude,
    orderBy: [{ year: "desc" }, { term: "desc" }, { createdAt: "asc" }],
  });
  return goals.map(withGoalProgress);
}

export async function getGoal(id: string): Promise<GoalListItem | null> {
  const goal = await db.goal.findUnique({ where: { id }, include: goalInclude });
  return goal ? withGoalProgress(goal) : null;
}

/** Distinct terms that have goals, newest first (for the term filter). */
export async function listGoalTerms(): Promise<string[]> {
  const rows = await db.goal.findMany({
    select: { term: true, year: true },
    distinct: ["term"],
    orderBy: [{ year: "desc" }, { term: "desc" }],
  });
  return rows.map((r) => r.term);
}

/** Minimal goal options for project forms. */
export async function listGoalOptions() {
  return db.goal.findMany({
    select: { id: true, title: true, term: true, status: true },
    orderBy: [{ year: "desc" }, { term: "desc" }, { title: "asc" }],
  });
}

// ──────────────────────────── Projects ───────────────────────────

const projectInclude = {
  goal: { select: { id: true, title: true, term: true } },
  owner: { select: { id: true, firstName: true, lastName: true } },
  tasks: { select: { status: true } },
} satisfies Prisma.ProjectInclude;

type ProjectWithTasks = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;
export type ProjectListItem = Omit<ProjectWithTasks, "tasks"> & { progress: ProgressSummary };

function withProjectProgress({ tasks, ...p }: ProjectWithTasks): ProjectListItem {
  return { ...p, progress: summarizeTasks(tasks) };
}

export async function listProjects(opts: { status?: string; goalId?: string } = {}): Promise<ProjectListItem[]> {
  const projects = await db.project.findMany({
    where: {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.goalId ? { goalId: opts.goalId } : {}),
    },
    include: projectInclude,
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
  });
  return projects.map(withProjectProgress);
}

export async function getProject(id: string) {
  const project = await db.project.findUnique({
    where: { id },
    include: {
      goal: { select: { id: true, title: true, term: true } },
      owner: { select: { id: true, firstName: true, lastName: true } },
      tasks: { select: taskRowSelect, orderBy: [{ sortOrder: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!project) return null;
  return { ...project, progress: summarizeTasks(project.tasks) };
}

/** Minimal project options for task forms and filters. */
export async function listProjectOptions(opts: { activeOnly?: boolean } = {}) {
  return db.project.findMany({
    where: opts.activeOnly ? { status: { in: ["ACTIVE", "ON_HOLD"] } } : {},
    select: { id: true, title: true, color: true, status: true },
    orderBy: { title: "asc" },
  });
}

// ───────────────────────────── Tasks ─────────────────────────────

export type TaskFilters = {
  status?: string;
  priority?: string;
  assigneeId?: string;
  projectId?: string;
  dueFrom?: Date | null;
  dueTo?: Date | null;
  needsOwner?: boolean;
  /** Only tasks assigned to this user (volunteer restriction or the "mine" toggle). */
  onlyAssignedTo?: string;
  /**
   * Volunteer view: tasks assigned to this user PLUS personal tasks they created.
   * (Personal tasks are assigned to their creator anyway, but we spell it out so
   * the rule is obvious and survives future changes.)
   */
  visibleToVolunteer?: string;
};

export async function listTasks(filters: TaskFilters = {}): Promise<TaskRow[]> {
  const where: Prisma.TaskWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.needsOwner) where.needsOwner = true;
  if (filters.dueFrom || filters.dueTo) {
    where.dueDate = {
      ...(filters.dueFrom ? { gte: filters.dueFrom } : {}),
      ...(filters.dueTo ? { lte: filters.dueTo } : {}),
    };
  }
  const assignee = filters.onlyAssignedTo ?? filters.assigneeId;
  if (assignee) where.assignees = { some: { userId: assignee } };
  if (filters.visibleToVolunteer) {
    const uid = filters.visibleToVolunteer;
    where.OR = [{ assignees: { some: { userId: uid } } }, { isPersonal: true, createdById: uid }];
  }
  return db.task.findMany({
    where,
    select: taskRowSelect,
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });
}

/**
 * "Unclaimed" tasks: flagged as needing an owner, nobody assigned, not done.
 * Shown to everyone (volunteers too) so anyone can pick one up.
 */
export async function listUnclaimedTasks(): Promise<TaskRow[]> {
  return db.task.findMany({
    where: { needsOwner: true, isPersonal: false, status: { not: "DONE" }, assignees: { none: {} } },
    select: taskRowSelect,
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });
}

/** Full task for the detail page. */
export async function getTask(id: string) {
  return db.task.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, title: true, color: true, status: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      assignees: { select: { user: { select: { id: true, firstName: true, lastName: true, photoKey: true } } } },
      links: { orderBy: { label: "asc" } },
      comments: {
        include: { author: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export type TaskDetail = NonNullable<Awaited<ReturnType<typeof getTask>>>;

/** True when the user is one of the task's assignees. Used for volunteer checks. */
export async function isAssignedTo(taskId: string, userId: string) {
  const row = await db.taskAssignee.findUnique({ where: { taskId_userId: { taskId, userId } } });
  return !!row;
}

// ─────────────────────────── Dashboard ───────────────────────────

export async function getAdminDashboard(now = new Date()) {
  const termStart = termStartDate(now);
  const [goals, projects, tasks, feedback] = await Promise.all([
    db.goal.findMany({ where: { status: "ACTIVE" }, include: goalInclude, orderBy: { createdAt: "asc" } }),
    db.project.findMany({
      where: { status: { in: ["ACTIVE", "ON_HOLD"] } },
      select: { id: true, title: true, color: true, status: true, tasks: { select: { status: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.task.findMany({ select: taskRowSelect, orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] }),
    db.feedbackItem.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        category: true,
        status: true,
        body: true,
        anonymous: true,
        createdAt: true,
        author: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const openTasks = tasks.filter((t) => t.status !== "DONE");
  const overdue = openTasks.filter((t) => isTaskOverdue(t, now));
  const dueThisWeek = openTasks.filter((t) => isDueThisWeek(t, now));
  const needsOwner = openTasks.filter((t) => t.needsOwner || t.assignees.length === 0);
  const doneThisTerm = tasks.filter((t) => t.status === "DONE" && t.completedAt && t.completedAt >= termStart);

  return {
    stats: {
      activeGoals: goals.length,
      activeProjects: projects.filter((p) => p.status === "ACTIVE").length,
      openTasks: openTasks.length,
      overdue: overdue.length,
      doneThisTerm: doneThisTerm.length,
      needsOwner: needsOwner.length,
    },
    goals: goals.map(withGoalProgress),
    // One row per active project for the stacked bar chart.
    tasksByProject: projects.map((p) => ({
      id: p.id,
      name: p.title,
      color: p.color,
      ...summarizeTasks(p.tasks).byStatus,
    })),
    completedPerWeek: countCompletedPerWeek(tasks, 8, now),
    dueThisWeek: dueThisWeek.sort(byDueDate).slice(0, 10),
    overdue: overdue.sort(byDueDate).slice(0, 10),
    needsOwner: needsOwner.sort(byDueDate).slice(0, 10),
    feedback,
  };
}

export async function getVolunteerDashboard(userId: string, now = new Date()) {
  const termStart = termStartDate(now);
  const [tasks, hoursTerm, hoursAll, courses, unclaimedCount] = await Promise.all([
    db.task.findMany({
      where: {
        status: { not: "DONE" },
        OR: [{ assignees: { some: { userId } } }, { isPersonal: true, createdById: userId }],
      },
      select: taskRowSelect,
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }),
    db.hoursLog.aggregate({ where: { userId, date: { gte: termStart } }, _sum: { hours: true } }),
    db.hoursLog.aggregate({ where: { userId }, _sum: { hours: true } }),
    db.course.count({ where: { isPublished: true } }),
    // Open tasks nobody owns yet — the volunteer could claim one of these.
    db.task.count({ where: { needsOwner: true, isPersonal: false, status: { not: "DONE" }, assignees: { none: {} } } }),
  ]);
  return {
    openTasks: tasks.sort(byDueDate),
    overdueCount: tasks.filter((t) => isTaskOverdue(t, now)).length,
    hoursThisTerm: hoursTerm._sum.hours ?? 0,
    hoursAllTime: hoursAll._sum.hours ?? 0,
    coursesCount: courses,
    unclaimedCount,
  };
}

// ─────────────────────────── CSV exports ─────────────────────────

export async function tasksForExport() {
  const tasks = await db.task.findMany({
    select: {
      ...taskRowSelect,
      description: true,
      project: { select: { id: true, title: true, color: true, goal: { select: { title: true } } } },
    },
    orderBy: [{ project: { title: "asc" } }, { dueDate: "asc" }],
  });
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    project: t.project?.title ?? "",
    goal: t.project?.goal?.title ?? "",
    status: t.status,
    priority: t.priority,
    needsOwner: t.needsOwner ? "yes" : "no",
    personal: t.isPersonal ? "yes" : "no",
    assignees: t.assignees.map((a) => `${a.user.firstName} ${a.user.lastName}`).join("; "),
    startDate: t.startDate,
    dueDate: t.dueDate,
    completedAt: t.completedAt,
    createdAt: t.createdAt,
    description: t.description ?? "",
  }));
}

export async function projectsForExport() {
  const projects = await listProjects();
  return projects.map((p) => ({
    id: p.id,
    title: p.title,
    goal: p.goal?.title ?? "",
    term: p.goal?.term ?? "",
    owner: p.owner ? `${p.owner.firstName} ${p.owner.lastName}` : "",
    status: p.status,
    startDate: p.startDate,
    dueDate: p.dueDate,
    tasksTotal: p.progress.total,
    tasksDone: p.progress.done,
    percentDone: p.progress.pct,
    description: p.description ?? "",
  }));
}
