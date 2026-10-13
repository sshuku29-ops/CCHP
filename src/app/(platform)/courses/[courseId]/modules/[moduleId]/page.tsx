import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getModule, canManageLms } from "@/lib/lms/queries";
import { toggleModuleCompletion, deleteResource, deleteVideo, deleteAssignment, deleteModule } from "@/lib/lms/actions";
import { fmtDate, isOverdue } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { Markdown } from "@/components/shared/markdown";
import { YouTubeEmbed } from "@/components/shared/youtube-embed";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleEditForm } from "@/components/lms/module-forms";
import { ResourceAddForm, ResourceEditForm, VideoAddForm } from "@/components/lms/resource-forms";
import { AssignmentForm, SUBMISSION_TYPE_LABELS } from "@/components/lms/assignment-form";

export const metadata = { title: "Module" };

/** /courses/[courseId]/modules/[moduleId] — instructions, resources, videos, assignments. */
export default async function ModulePage(props: PageProps<"/courses/[courseId]/modules/[moduleId]">) {
  const user = await requireUser();
  const { courseId, moduleId } = await props.params;
  const mod = await getModule(courseId, moduleId, user);
  if (!mod) notFound();
  const manage = canManageLms(user);
  const base = `/courses/${courseId}/modules/${moduleId}`;

  const content = (
    <div className="space-y-6">
      {mod.instructions ? (
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <Markdown source={mod.instructions} />
          </CardContent>
        </Card>
      ) : null}

      {mod.resources.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {mod.resources.map((r) => (
                <li key={r.id}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4">
                    {r.label}
                    <ExternalLink className="size-3.5 text-muted-foreground" />
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {mod.videos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Videos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {mod.videos.map((v) => (
              <div key={v.id} className="space-y-2">
                <p className="text-sm font-medium">{v.title}</p>
                <YouTubeEmbed url={v.youtubeUrl} title={v.title} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
          {mod.assignments.length === 0 ? <CardDescription>Nothing to submit for this module.</CardDescription> : null}
        </CardHeader>
        {mod.assignments.length > 0 ? (
          <CardContent>
            <ul className="divide-y">
              {mod.assignments.map((a) => (
                <li key={a.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`${base}/assignments/${a.id}`} className="font-medium hover:underline underline-offset-4">
                      {a.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {SUBMISSION_TYPE_LABELS[a.submissionType as keyof typeof SUBMISSION_TYPE_LABELS] ?? a.submissionType} · Due {fmtDate(a.dueDate)}
                      {isOverdue(a.dueDate) && !a.latestSubmission ? <span className="text-destructive"> · overdue</span> : null}
                    </p>
                  </div>
                  {a.latestSubmission ? <StatusBadge status={a.latestSubmission.status} /> : <Badge variant="outline">Not submitted</Badge>}
                </li>
              ))}
            </ul>
          </CardContent>
        ) : null}
      </Card>

      {/* Mark complete toggle: one click, server action, no client state. */}
      <form action={toggleModuleCompletion.bind(null, mod.id)} className="flex items-center gap-3">
        <SubmitButton variant={mod.completed ? "outline" : "default"} pendingText="Saving…">
          {mod.completed ? "Mark as not complete" : "Mark module complete"}
        </SubmitButton>
        {mod.completed ? (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
            <CircleCheck className="size-4" /> Completed {fmtDate(mod.completions[0]?.completedAt)}
          </span>
        ) : null}
      </form>
    </div>
  );

  return (
    <div className="max-w-3xl">
      <p className="text-sm mb-2">
        <Link href={`/courses/${courseId}`} className="text-muted-foreground hover:underline underline-offset-4">
          ← {mod.course.title}
        </Link>
      </p>
      <PageHeader
        title={mod.title}
        description={mod.summary ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            {mod.completed ? <StatusBadge status="DONE" label="Completed" /> : null}
            <Badge variant="secondary">Due {fmtDate(mod.dueDate)}</Badge>
          </div>
        }
      />

      {!manage ? (
        content
      ) : (
        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
          </TabsList>
          <TabsContent value="content" className="pt-4">
            {content}
          </TabsContent>
          <TabsContent value="manage" className="pt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Module details</CardTitle>
              </CardHeader>
              <CardContent>
                <ModuleEditForm module={mod} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resources</CardTitle>
                <CardDescription>Links to docs, slides, checklists, articles.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mod.resources.map((r) => (
                  <div key={r.id} className="rounded-lg border p-3 space-y-2">
                    <ResourceEditForm resource={r} />
                    <ConfirmButton action={deleteResource.bind(null, r.id)} message={`Remove "${r.label}"?`} size="xs" variant="ghost" className="text-destructive">
                      Remove
                    </ConfirmButton>
                  </div>
                ))}
                <div className="rounded-lg border border-dashed p-3">
                  <ResourceAddForm moduleId={mod.id} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Videos</CardTitle>
                <CardDescription>Only unlisted YouTube links. Nothing is uploaded to the platform.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mod.videos.length > 0 ? (
                  <ul className="divide-y">
                    {mod.videos.map((v) => (
                      <li key={v.id} className="py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{v.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{v.youtubeUrl}</p>
                        </div>
                        <ConfirmButton action={deleteVideo.bind(null, v.id)} message={`Remove the video "${v.title}"?`} size="xs" variant="ghost" className="text-destructive">
                          Remove
                        </ConfirmButton>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="rounded-lg border border-dashed p-3">
                  <VideoAddForm moduleId={mod.id} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assignments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mod.assignments.map((a) => (
                  <div key={a.id} className="rounded-lg border p-3 space-y-2">
                    <AssignmentForm moduleId={mod.id} assignment={a} />
                    <ConfirmButton
                      action={deleteAssignment.bind(null, a.id)}
                      message={`Delete "${a.title}" and every submission to it?`}
                      size="xs"
                      variant="ghost"
                      className="text-destructive"
                    >
                      Delete assignment
                    </ConfirmButton>
                  </div>
                ))}
                <div className="rounded-lg border border-dashed p-3">
                  <p className="text-sm font-medium mb-3">New assignment</p>
                  <AssignmentForm moduleId={mod.id} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle>Danger zone</CardTitle>
              </CardHeader>
              <CardContent>
                <ConfirmButton action={deleteModule.bind(null, mod.id)} message={`Delete "${mod.title}" and everything in it?`} variant="destructive" size="sm">
                  Delete module
                </ConfirmButton>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
