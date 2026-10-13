import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { canManageProjects, listActiveUsers, listProjectOptions, listTasks, listUnclaimedTasks } from "@/lib/projects/queries";
import { parseDateInput } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonalTaskForm } from "@/components/projects/personal-task-form";
import { UnclaimedTasks } from "@/components/projects/unclaimed-tasks";
import { TaskFilters, type TaskFilterValues } from "@/components/projects/task-filters";
import { TaskViews } from "@/components/projects/task-views";
import { ViewTabs, parseView } from "@/components/projects/view-tabs";

export const metadata = { title: "Tasks" };

function str(v: string | string[] | undefined) {
  return typeof v === "string" && v ? v : undefined;
}

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const user = await requireUser();
  const manager = canManageProjects(user);
  const sp = await searchParams;
  const view = parseView(sp.view);

  // Volunteers (and admins without the projects module) only ever see their own tasks.
  const values: TaskFilterValues = manager
    ? {
        status: str(sp.status),
        projectId: str(sp.projectId),
        assigneeId: str(sp.assigneeId),
        dueFrom: str(sp.dueFrom),
        dueTo: str(sp.dueTo),
        needsOwner: str(sp.needsOwner),
        mine: str(sp.mine),
        view: sp.view === "list" ? undefined : str(sp.view),
      }
    : { status: str(sp.status), view: sp.view === "list" ? undefined : str(sp.view) };

  // Volunteers see tasks assigned to them plus their own personal tasks.
  // Admins see everything (personal tasks carry a "Personal" badge).
  const [tasks, unclaimed] = await Promise.all([
    listTasks({
      status: values.status,
      projectId: values.projectId,
      assigneeId: values.assigneeId,
      dueFrom: parseDateInput(values.dueFrom),
      dueTo: parseDateInput(values.dueTo),
      needsOwner: values.needsOwner === "1",
      onlyAssignedTo: manager && values.mine === "1" ? user.id : undefined,
      visibleToVolunteer: manager ? undefined : user.id,
    }),
    listUnclaimedTasks(),
  ]);

  const [projects, users] = manager ? await Promise.all([listProjectOptions(), listActiveUsers()]) : [[], []];

  return (
    <div className="space-y-4">
      <PageHeader
        title={manager ? "All tasks" : "My tasks"}
        description={manager ? "Every task across projects. Filter, then switch between list, board and timeline." : "Tasks assigned to you plus your own personal to-dos. Update the status as you go."}
        actions={
          manager ? (
            <>
              <Button asChild variant="outline" size="sm">
                <a href="/api/export/tasks">
                  <Download /> Export CSV
                </a>
              </Button>
              <Button asChild size="sm">
                <Link href="/tasks/new">
                  <Plus /> New task
                </Link>
              </Button>
            </>
          ) : null
        }
      />

      {/* Open tasks nobody owns — anyone can claim one. */}
      <UnclaimedTasks tasks={unclaimed} />

      {/* Volunteers add private to-dos here; admins use the full form at /tasks/new. */}
      {!manager ? (
        <details className="group rounded-xl border bg-card">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">
            <Plus className="mr-1.5 inline size-4 align-text-bottom" />
            New task (just for you)
          </summary>
          <Card size="sm" className="rounded-t-none ring-0 border-t">
            <CardHeader>
              <CardTitle>Personal task</CardTitle>
              <CardDescription>Only you and leadership can see it. It shows up in your list below.</CardDescription>
            </CardHeader>
            <CardContent>
              <PersonalTaskForm />
            </CardContent>
          </Card>
        </details>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <ViewTabs basePath="/tasks" view={view} params={{ ...values, view: undefined }} />
        <p className="text-sm text-muted-foreground">
          {tasks.length} task{tasks.length === 1 ? "" : "s"}
        </p>
      </div>

      {manager ? (
        <TaskFilters values={values} projects={projects} users={users} />
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusLink href={`/tasks${values.view ? `?view=${values.view}` : ""}`} active={!values.status}>
            All
          </StatusLink>
          {(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const).map((s) => (
            <StatusLink key={s} href={`/tasks?status=${s}${values.view ? `&view=${values.view}` : ""}`} active={values.status === s}>
              {s === "TODO" ? "To do" : s === "IN_PROGRESS" ? "In progress" : s === "BLOCKED" ? "Blocked" : "Done"}
            </StatusLink>
          ))}
        </div>
      )}

      <TaskViews view={view} tasks={tasks} showProject />
    </div>
  );
}

function StatusLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full border border-primary bg-primary px-3 py-1 text-primary-foreground"
          : "rounded-full border px-3 py-1 transition-colors hover:bg-muted"
      }
    >
      {children}
    </Link>
  );
}
