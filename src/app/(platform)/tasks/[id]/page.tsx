import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { canManageProjects, getTask, listActiveUsers, listProjectOptions } from "@/lib/projects/queries";
import { claimTask, deleteTask, releaseTask } from "@/lib/projects/actions";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/lib/constants";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { Markdown } from "@/components/shared/markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Assignees, DueDate, NeedsOwnerBadge, PersonalBadge, PriorityBadge, ProjectChip } from "@/components/projects/bits";
import { ActionButton } from "@/components/projects/action-button";
import { TaskForm } from "@/components/projects/task-form";
import { TaskStatusForm } from "@/components/projects/task-status-form";
import { TaskLinks } from "@/components/projects/task-links";
import { TaskComments } from "@/components/projects/task-comments";

export const metadata = { title: "Task" };

export default async function TaskDetailPage({ params }: PageProps<"/tasks/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const task = await getTask(id);
  if (!task) notFound();

  // Admins with the projects module can open any task; everyone else only their
  // own (assigned to them, their personal tasks, or an unclaimed task they could claim).
  const manager = canManageProjects(user);
  const assignedToMe = task.assignees.some((a) => a.user.id === user.id);
  const ownsPersonal = task.isPersonal && task.createdById === user.id;
  const unclaimed = task.needsOwner && task.assignees.length === 0 && !task.isPersonal && task.status !== "DONE";
  if (!manager && !assignedToMe && !ownsPersonal && !unclaimed) redirect("/dashboard?denied=1");

  const [projects, users] = manager ? await Promise.all([listProjectOptions(), listActiveUsers()]) : [[], []];

  return (
    <div className="space-y-6">
      <PageHeader
        title={task.title}
        description={task.project ? `In project: ${task.project.title}` : "Not attached to a project"}
        actions={
          <>
            <StatusBadge status={task.status} label={TASK_STATUS_LABELS[task.status as TaskStatus]} />
            {task.isPersonal ? <PersonalBadge /> : null}
            {task.needsOwner && task.assignees.length === 0 ? <NeedsOwnerBadge /> : null}
            {unclaimed ? (
              <ActionButton action={claimTask.bind(null, task.id)} size="sm">
                Claim
              </ActionButton>
            ) : null}
            {manager && !task.isPersonal && task.assignees.length > 0 && task.status !== "DONE" ? (
              <ConfirmButton action={releaseTask.bind(null, task.id)} message="Release this task? Its assignees are removed and anyone can claim it." variant="outline" size="sm">
                Release
              </ConfirmButton>
            ) : null}
            {manager || ownsPersonal ? (
              <ConfirmButton action={deleteTask.bind(null, task.id)} message="Delete this task? Its comments and links go with it." variant="ghost" size="sm" className="text-destructive">
                Delete
              </ConfirmButton>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: what the task is + discussion */}
        <div className="space-y-6 lg:col-span-3">
          <Card size="sm">
            <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Detail label="Project">
                <ProjectChip project={task.project} />
              </Detail>
              <Detail label="Assignees">
                {task.assignees.length === 0 ? (
                  <span className="text-muted-foreground">Nobody yet</span>
                ) : (
                  <Assignees task={{ ...task, needsOwner: false }} full />
                )}
              </Detail>
              <Detail label="Priority">
                <PriorityBadge priority={task.priority} />
              </Detail>
              <Detail label="Start">{fmtDate(task.startDate)}</Detail>
              <Detail label="Due">
                <DueDate task={task} />
              </Detail>
              <Detail label="Completed">{task.completedAt ? fmtDate(task.completedAt) : "—"}</Detail>
              <Detail label="Created">
                {fmtDateTime(task.createdAt)}
                {task.createdBy ? ` by ${task.createdBy.firstName} ${task.createdBy.lastName}` : ""}
              </Detail>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? <Markdown source={task.description} className="text-sm" /> : <p className="text-sm text-muted-foreground">No description.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Links &amp; resources</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskLinks taskId={task.id} links={task.links} canEdit={manager} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskComments taskId={task.id} comments={task.comments} currentUserId={user.id} />
            </CardContent>
          </Card>
        </div>

        {/* Right: editing */}
        <div className="space-y-6 lg:col-span-2">
          {manager ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit task</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskForm
                  task={{
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    projectId: task.projectId,
                    status: task.status,
                    priority: task.priority,
                    needsOwner: task.needsOwner,
                    startDate: task.startDate,
                    dueDate: task.dueDate,
                    assigneeIds: task.assignees.map((a) => a.user.id),
                  }}
                  projects={projects}
                  users={users}
                />
              </CardContent>
            </Card>
          ) : assignedToMe ? (
            <Card>
              <CardHeader>
                <CardTitle>Your status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <TaskStatusForm taskId={task.id} status={task.status} />
                <p className="text-xs text-muted-foreground">
                  Only leadership can change the title, dates or assignees. Leave a comment if something needs to change, or go back to{" "}
                  <Link href="/tasks" className="underline">
                    your tasks
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Unclaimed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Nobody owns this task yet. Claim it (button above) and it moves to your list.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="truncate">{children}</div>
    </div>
  );
}
