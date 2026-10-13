import Link from "next/link";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { requireUser, isAdmin } from "@/lib/auth/guards";
import { getAdminDashboard, getVolunteerDashboard, type TaskRow } from "@/lib/projects/queries";
import { fmtDate, termForDate, toDateInput } from "@/lib/dates";
import { todayUtc } from "@/lib/projects/progress";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Assignees, DueDate, ProgressBar, ProjectDot } from "@/components/projects/bits";
import { CompletedPerWeekChart, TasksByProjectChart } from "@/components/projects/dashboard-charts";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/lib/constants";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  const sp = await searchParams;
  const term = termForDate(new Date());

  return (
    <div className="space-y-6">
      {sp.pw === "changed" ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Password changed</AlertTitle>
          <AlertDescription>Your new password is saved. Other devices were signed out.</AlertDescription>
        </Alert>
      ) : null}
      {sp.denied === "1" ? (
        <Alert variant="destructive">
          <ShieldAlert />
          <AlertTitle>You don&apos;t have access to that page</AlertTitle>
          <AlertDescription>If you think you should, ask the Main Admin to update your role or modules.</AlertDescription>
        </Alert>
      ) : null}

      {isAdmin(user) ? <AdminDashboard firstName={user.firstName} term={term} /> : <VolunteerDashboard userId={user.id} firstName={user.firstName} term={term} />}
    </div>
  );
}

// ───────────────────────── Admin view ─────────────────────────

async function AdminDashboard({ firstName, term }: { firstName: string; term: string }) {
  const d = await getAdminDashboard();
  // Query strings for the "View" links so they open /tasks pre-filtered.
  const today = todayUtc();
  const dueFrom = toDateInput(today);
  const dueTo = toDateInput(new Date(today.getTime() + 6 * 86_400_000));
  const yesterday = toDateInput(new Date(today.getTime() - 86_400_000));
  return (
    <>
      <PageHeader title={`Welcome, ${firstName}`} description={`Team dashboard · ${term}. Collective progress for the weekly roundtable.`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Active goals" value={d.stats.activeGoals} />
        <StatCard label="Active projects" value={d.stats.activeProjects} />
        <StatCard label="Open tasks" value={d.stats.openTasks} />
        <StatCard label="Overdue" value={d.stats.overdue} hint={d.stats.overdue > 0 ? "Needs attention" : "All caught up"} />
        <StatCard label="Done this term" value={d.stats.doneThisTerm} hint={term} />
        <StatCard label="Needs an owner" value={d.stats.needsOwner} hint="Unassigned open tasks" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by status, per project</CardTitle>
            <CardDescription>Active and on-hold projects.</CardDescription>
          </CardHeader>
          <CardContent>
            <TasksByProjectChart data={d.tasksByProject} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tasks completed per week</CardTitle>
            <CardDescription>Last 8 weeks, whole team.</CardDescription>
          </CardHeader>
          <CardContent>
            <CompletedPerWeekChart data={d.completedPerWeek} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Goal progress</CardTitle>
          <CardDescription>Share of tasks done across each active goal&apos;s projects.</CardDescription>
        </CardHeader>
        <CardContent>
          {d.goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active goals.{" "}
              <Link href="/goals/new" className="underline">
                Create one
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-3">
              {d.goals.map((g) => (
                <li key={g.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <Link href={`/goals/${g.id}`} className="font-medium hover:underline">
                      {g.title}
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {g.projects.length} project{g.projects.length === 1 ? "" : "s"}
                      {g.targetDate ? ` · target ${fmtDate(g.targetDate)}` : ""}
                    </span>
                  </div>
                  <ProgressBar progress={g.progress} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <TaskListCard title="Due this week" tasks={d.dueThisWeek} empty="Nothing due in the next 7 days." href={`/tasks?dueFrom=${dueFrom}&dueTo=${dueTo}`} />
        <TaskListCard title="Overdue" tasks={d.overdue} empty="No overdue tasks." href={`/tasks?dueTo=${yesterday}`} danger />
        <TaskListCard title="Needs an owner" tasks={d.needsOwner} empty="Every open task has an owner." href="/tasks?needsOwner=1" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Latest feedback &amp; ideas</CardTitle>
            <CardDescription>Newest five. Review these at the roundtable.</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/feedback">All feedback</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {d.feedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          ) : (
            <ul className="divide-y">
              {d.feedback.map((f) => (
                <li key={f.id} className="flex flex-col gap-1 py-2.5 text-sm sm:flex-row sm:items-start sm:gap-3">
                  <div className="flex shrink-0 items-center gap-1.5">
                    <StatusBadge status={f.category} />
                    <StatusBadge status={f.status} />
                  </div>
                  <p className="min-w-0 flex-1">{f.body}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {f.anonymous || !f.author ? "Anonymous" : `${f.author.firstName} ${f.author.lastName}`} · {fmtDate(f.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function TaskListCard({ title, tasks, empty, href, danger }: { title: string; tasks: TaskRow[]; empty: string; href: string; danger?: boolean }) {
  return (
    <Card size="sm">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className={danger && tasks.length > 0 ? "flex items-center gap-1.5 text-red-600 dark:text-red-400" : undefined}>
          {danger && tasks.length > 0 ? <AlertTriangle className="size-4" /> : null}
          {title}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">{tasks.length}</span>
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link href={href}>View</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y">
            {tasks.map((t) => (
              <li key={t.id} className="py-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/tasks/${t.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                    {t.title}
                  </Link>
                  <DueDate task={t} className="shrink-0 text-xs" />
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {t.project ? (
                    <span className="inline-flex items-center gap-1 truncate">
                      <ProjectDot color={t.project.color} /> {t.project.title}
                    </span>
                  ) : null}
                  <span className="truncate">
                    <Assignees task={t} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────── Volunteer view ──────────────────────

async function VolunteerDashboard({ userId, firstName, term }: { userId: string; firstName: string; term: string }) {
  const d = await getVolunteerDashboard(userId);
  return (
    <>
      <PageHeader title={`Welcome, ${firstName}`} description="Your tasks, training, and hours." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Open tasks" value={d.openTasks.length} hint={d.overdueCount > 0 ? `${d.overdueCount} overdue` : undefined} />
        <StatCard label={`Hours · ${term}`} value={formatHours(d.hoursThisTerm)} />
        <StatCard label="Hours · all time" value={formatHours(d.hoursAllTime)} />
        <StatCard label="Training courses" value={d.coursesCount} hint="Available to you" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Your open tasks</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/tasks">All my tasks</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {d.openTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing assigned to you right now. Enjoy the breather.</p>
            ) : (
              <ul className="divide-y">
                {d.openTasks.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                    <Link href={`/tasks/${t.id}`} className="min-w-0 flex-1 font-medium hover:underline">
                      {t.title}
                    </Link>
                    {t.project ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <ProjectDot color={t.project.color} /> {t.project.title}
                      </span>
                    ) : null}
                    <StatusBadge status={t.status} label={TASK_STATUS_LABELS[t.status as TaskStatus]} />
                    <DueDate task={t} className="w-24 text-right text-xs" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <QuickLink href="/tasks" label="My tasks" hint="Update status as you go" />
            <QuickLink href="/courses" label="Training" hint={`${d.coursesCount} course${d.coursesCount === 1 ? "" : "s"}`} />
            <QuickLink href="/hours" label="Log hours" hint="Sessions, prep, other" />
            <QuickLink href="/calendar" label="Calendar" hint="Sessions and deadlines" />
            <QuickLink href="/feedback" label="Share an idea" hint="Feedback inbox for leadership" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function QuickLink({ href, label, hint }: { href: string; label: string; hint?: string }) {
  return (
    <Link href={href} className="rounded-lg border px-3 py-2 transition-colors hover:bg-muted">
      <span className="block text-sm font-medium">{label}</span>
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </Link>
  );
}

function formatHours(h: number) {
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}
