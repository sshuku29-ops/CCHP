import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { requireModule } from "@/lib/auth/guards";
import { getProject } from "@/lib/projects/queries";
import { setProjectStatus } from "@/lib/projects/actions";
import { fmtDate } from "@/lib/dates";
import { isTaskOverdue } from "@/lib/projects/progress";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { Markdown } from "@/components/shared/markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar, ProjectDot } from "@/components/projects/bits";
import { QuickAddTask } from "@/components/projects/quick-add-task";
import { TaskViews } from "@/components/projects/task-views";
import { ViewTabs, parseView } from "@/components/projects/view-tabs";

export const metadata = { title: "Project" };

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Active", ON_HOLD: "On hold", COMPLETED: "Completed", ARCHIVED: "Archived" };

export default async function ProjectDetailPage({ params, searchParams }: PageProps<"/projects/[id]">) {
  await requireModule("projects");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const project = await getProject(id);
  if (!project) notFound();
  const view = parseView(sp.view);
  const overdueCount = project.tasks.filter((t) => isTaskOverdue(t)).length;
  const needsOwnerCount = project.tasks.filter((t) => t.status !== "DONE" && (t.needsOwner || t.assignees.length === 0)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.title}
        description={[
          project.goal ? `Goal: ${project.goal.title}` : "No goal",
          project.owner ? `Owner: ${project.owner.firstName} ${project.owner.lastName}` : "No owner",
          project.dueDate ? `Due ${fmtDate(project.dueDate)}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <StatusBadge status={project.status} label={STATUS_LABELS[project.status]} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects/${project.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
            {project.status === "ARCHIVED" ? (
              <ConfirmButton action={setProjectStatus.bind(null, project.id, "ACTIVE")} message="Reopen this project?" variant="ghost" size="sm">
                Reopen
              </ConfirmButton>
            ) : (
              <ConfirmButton action={setProjectStatus.bind(null, project.id, "ARCHIVED")} message="Archive this project? Tasks are kept." variant="ghost" size="sm">
                Archive
              </ConfirmButton>
            )}
          </>
        }
      />

      <Card size="sm">
        <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <ProjectDot color={project.color} />
              <span className="font-medium">
                {project.progress.done} of {project.progress.total} tasks done
              </span>
              {overdueCount > 0 ? <span className="text-red-600 dark:text-red-400">· {overdueCount} overdue</span> : null}
              {needsOwnerCount > 0 ? <span className="text-amber-700 dark:text-amber-300">· {needsOwnerCount} need an owner</span> : null}
            </div>
            <ProgressBar progress={project.progress} showLabel={false} />
          </div>
          <dl className="flex gap-4 text-xs text-muted-foreground">
            {(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const).map((s) => (
              <div key={s}>
                <dt>{s === "TODO" ? "To do" : s === "IN_PROGRESS" ? "In progress" : s === "BLOCKED" ? "Blocked" : "Done"}</dt>
                <dd className="font-heading text-lg font-semibold text-foreground tabular-nums">{project.progress.byStatus[s]}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {project.description ? (
        <Card size="sm">
          <CardContent>
            <Markdown source={project.description} className="text-sm" />
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold">Tasks</h2>
          <div className="flex items-center gap-2">
            <ViewTabs basePath={`/projects/${project.id}`} view={view} />
            <Button asChild size="sm" variant="outline">
              <Link href={`/tasks/new?projectId=${project.id}`}>
                <Plus /> Full form
              </Link>
            </Button>
          </div>
        </div>
        <QuickAddTask projectId={project.id} />
        <TaskViews view={view} tasks={project.tasks} showProject={false} />
      </section>
    </div>
  );
}
