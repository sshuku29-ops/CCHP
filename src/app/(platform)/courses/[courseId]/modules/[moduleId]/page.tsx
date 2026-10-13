import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getModule, canManageLms } from "@/lib/lms/queries";
import { toggleModuleCompletion, deleteResource, deleteVideo, deleteAssignment, deleteModule, deleteQuiz } from "@/lib/lms/actions";
import { fmtDate, isOverdue } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { Markdown } from "@/components/shared/markdown";
import { YouTubeEmbed } from "@/components/shared/youtube-embed";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleEditForm } from "@/components/lms/module-forms";
import { ResourceAddForm, ResourceEditForm, VideoAddForm } from "@/components/lms/resource-forms";
import { AssignmentForm, SUBMISSION_TYPE_LABELS } from "@/components/lms/assignment-form";
import { QuizForm } from "@/components/lms/quiz-forms";

export const metadata = { title: "Module" };

/**
 * /courses/[courseId]/modules/[moduleId] — instructions, resources, videos, quizzes, assignments.
 *
 * Volunteers see the content only. LMS admins see the same page with the management
 * controls right where the content is (add a video under Videos, etc.) — no hidden tab.
 */
export default async function ModulePage(props: PageProps<"/courses/[courseId]/modules/[moduleId]">) {
  const user = await requireUser();
  const { courseId, moduleId } = await props.params;
  const mod = await getModule(courseId, moduleId, user);
  if (!mod) notFound();
  const manage = canManageLms(user);
  const base = `/courses/${courseId}/modules/${moduleId}`;

  // A small dashed box that wraps every "add something" form so they look alike.
  const addBox = (title: string, children: ReactNode) => (
    <div className="rounded-lg border border-dashed p-3 sm:p-4">
      <p className="text-sm font-medium mb-3">{title}</p>
      {children}
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
          <div className="flex flex-wrap items-center gap-2">
            {mod.completed ? <StatusBadge status="DONE" label="Completed" /> : null}
            {mod.quizzes.length > 0 ? (
              <Badge variant={mod.quizzesPassed === mod.quizzes.length ? "default" : "secondary"}>
                Quizzes passed {mod.quizzesPassed}/{mod.quizzes.length}
              </Badge>
            ) : null}
            <Badge variant="secondary">Due {fmtDate(mod.dueDate)}</Badge>
          </div>
        }
      />

      <div className="space-y-6">
        {/* ── Admin: edit the module itself (collapsed by default so content stays first) ── */}
        {manage ? (
          <details className="rounded-xl border bg-card">
            <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium">Edit module details (title, summary, instructions, due date)</summary>
            <div className="border-t px-5 py-4 space-y-6">
              <ModuleEditForm module={mod} />
              <div className="rounded-lg border border-destructive/40 p-3">
                <p className="text-sm font-medium mb-2">Danger zone</p>
                <ConfirmButton action={deleteModule.bind(null, mod.id)} message={`Delete "${mod.title}" and everything in it?`} variant="destructive" size="sm">
                  Delete module
                </ConfirmButton>
              </div>
            </div>
          </details>
        ) : null}

        {/* ── Instructions ── */}
        {mod.instructions ? (
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <Markdown source={mod.instructions} />
            </CardContent>
          </Card>
        ) : manage ? (
          <p className="text-sm text-muted-foreground">No instructions yet — open “Edit module details” above to write some.</p>
        ) : null}

        {/* ── Videos (first, since they are the main teaching content) ── */}
        {mod.videos.length > 0 || manage ? (
          <Card>
            <CardHeader>
              <CardTitle>Videos</CardTitle>
              {manage && mod.videos.length === 0 ? <CardDescription>No videos yet. Add one below — it appears here right away.</CardDescription> : null}
            </CardHeader>
            <CardContent className="space-y-6">
              {mod.videos.map((v) => (
                <div key={v.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{v.title}</p>
                    {manage ? (
                      <ConfirmButton action={deleteVideo.bind(null, v.id)} message={`Remove the video "${v.title}"?`} size="xs" variant="ghost" className="text-destructive">
                        Remove
                      </ConfirmButton>
                    ) : null}
                  </div>
                  <YouTubeEmbed url={v.youtubeUrl} title={v.title} />
                </div>
              ))}
              {manage ? addBox("Add a video", <VideoAddForm moduleId={mod.id} />) : null}
            </CardContent>
          </Card>
        ) : null}

        {/* ── Resources ── */}
        {mod.resources.length > 0 || manage ? (
          <Card>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
              {manage ? <CardDescription>Links to docs, slides, checklists, articles.</CardDescription> : null}
            </CardHeader>
            <CardContent className="space-y-4">
              {mod.resources.length > 0 ? (
                <ul className="space-y-2">
                  {mod.resources.map((r) => (
                    <li key={r.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4">
                          {r.label}
                          <ExternalLink className="size-3.5 text-muted-foreground" />
                        </a>
                        {manage ? (
                          <ConfirmButton action={deleteResource.bind(null, r.id)} message={`Remove "${r.label}"?`} size="xs" variant="ghost" className="text-destructive">
                            Remove
                          </ConfirmButton>
                        ) : null}
                      </div>
                      {manage ? (
                        <details className="rounded-lg border px-3 py-2">
                          <summary className="cursor-pointer select-none text-xs text-muted-foreground">Edit link</summary>
                          <div className="pt-2">
                            <ResourceEditForm resource={r} />
                          </div>
                        </details>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {manage ? addBox("Add a resource", <ResourceAddForm moduleId={mod.id} />) : null}
            </CardContent>
          </Card>
        ) : null}

        {/* ── Quizzes ── */}
        <Card>
          <CardHeader>
            <CardTitle>Quizzes</CardTitle>
            <CardDescription>
              {mod.quizzes.length === 0
                ? manage
                  ? "No quizzes yet. Create one below, then add its questions."
                  : "No quizzes in this module."
                : "Pass every quiz to complete this module. You can retake a quiz as many times as you like."}
            </CardDescription>
          </CardHeader>
          {mod.quizzes.length > 0 || manage ? (
            <CardContent className="space-y-4">
              {mod.quizzes.length > 0 ? (
                <ul className="divide-y">
                  {mod.quizzes.map((q) => (
                    <li key={q.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{q.title}</p>
                        {q.description ? <p className="text-sm text-muted-foreground">{q.description}</p> : null}
                        <p className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          <span>
                            {q.questionCount} question{q.questionCount === 1 ? "" : "s"}
                          </span>
                          <span>Pass mark {q.passPercent}%</span>
                          {q.best ? (
                            <span>
                              Your best: {q.best.percent}% ({q.attemptCount} attempt{q.attemptCount === 1 ? "" : "s"})
                            </span>
                          ) : (
                            <span>Not attempted yet</span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {q.best ? <StatusBadge status={q.best.passed ? "DONE" : "NEEDS_REVISION"} label={q.best.passed ? "Passed" : "Not passed yet"} /> : null}
                        <Button asChild size="sm" variant={q.best?.passed ? "outline" : "default"}>
                          <Link href={`${base}/quizzes/${q.id}`}>{q.best ? "Retake quiz" : "Take quiz"}</Link>
                        </Button>
                        {manage ? (
                          <>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`${base}/quizzes/${q.id}/edit`}>Edit questions</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`${base}/quizzes/${q.id}/results`}>Results</Link>
                            </Button>
                            <ConfirmButton
                              action={deleteQuiz.bind(null, q.id)}
                              message={`Delete the quiz "${q.title}" and every attempt at it?`}
                              size="xs"
                              variant="ghost"
                              className="text-destructive"
                            >
                              Delete
                            </ConfirmButton>
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
              {manage ? addBox("Create a quiz", <QuizForm moduleId={mod.id} />) : null}
            </CardContent>
          ) : null}
        </Card>

        {/* ── Assignments ── */}
        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
            {mod.assignments.length === 0 ? <CardDescription>{manage ? "No assignments yet." : "Nothing to submit for this module."}</CardDescription> : null}
          </CardHeader>
          {mod.assignments.length > 0 || manage ? (
            <CardContent className="space-y-4">
              {mod.assignments.length > 0 ? (
                <ul className="divide-y">
                  {mod.assignments.map((a) => (
                    <li key={a.id} className="py-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
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
                      </div>
                      {manage ? (
                        <details className="rounded-lg border px-3 py-2">
                          <summary className="cursor-pointer select-none text-xs text-muted-foreground">Edit assignment</summary>
                          <div className="pt-3 space-y-2">
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
                        </details>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {manage ? addBox("Add an assignment", <AssignmentForm moduleId={mod.id} />) : null}
            </CardContent>
          ) : null}
        </Card>

        {/* Mark complete toggle: one click, server action, no client state. */}
        <form action={toggleModuleCompletion.bind(null, mod.id)} className="flex flex-wrap items-center gap-3">
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
    </div>
  );
}
