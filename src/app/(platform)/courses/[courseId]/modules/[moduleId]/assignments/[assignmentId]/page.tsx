import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getAssignment, canManageLms } from "@/lib/lms/queries";
import { ALLOWED_EXTENSIONS, maxUploadBytes } from "@/lib/uploads";
import { fmtDate, isOverdue } from "@/lib/dates";
import { fullName } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Markdown } from "@/components/shared/markdown";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmissionForm } from "@/components/lms/submission-form";
import { SubmissionCard } from "@/components/lms/submission-card";
import { SUBMISSION_TYPE_LABELS } from "@/components/lms/assignment-form";

export const metadata = { title: "Assignment" };

/**
 * /courses/[courseId]/modules/[moduleId]/assignments/[assignmentId]
 * Volunteers: submit + see their own history. LMS admins: also review everyone's submissions.
 */
export default async function AssignmentPage(props: PageProps<"/courses/[courseId]/modules/[moduleId]/assignments/[assignmentId]">) {
  const user = await requireUser();
  const { courseId, moduleId, assignmentId } = await props.params;
  const a = await getAssignment(courseId, moduleId, assignmentId, user);
  if (!a) notFound();
  const manage = canManageLms(user);
  const typeLabel = SUBMISSION_TYPE_LABELS[a.submissionType as keyof typeof SUBMISSION_TYPE_LABELS] ?? a.submissionType;
  const overdue = isOverdue(a.dueDate) && a.mySubmissions.length === 0;

  // Group every volunteer's submissions by person for the admin review section.
  const byVolunteer = new Map<string, typeof a.allSubmissions>();
  for (const s of a.allSubmissions) {
    const list = byVolunteer.get(s.user.id) ?? [];
    list.push(s);
    byVolunteer.set(s.user.id, list);
  }

  return (
    <div className="max-w-3xl">
      <p className="text-sm mb-2">
        <Link href={`/courses/${courseId}/modules/${moduleId}`} className="text-muted-foreground hover:underline underline-offset-4">
          ← {a.module.title}
        </Link>
      </p>
      <PageHeader
        title={a.title}
        description={a.module.course.title}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{typeLabel}</Badge>
            <Badge variant={overdue ? "destructive" : "secondary"}>Due {fmtDate(a.dueDate)}</Badge>
          </div>
        }
      />

      <div className="space-y-6">
        {a.description ? (
          <Card>
            <CardContent className="pt-5">
              <Markdown source={a.description} />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{a.mySubmissions.length ? "Submit again" : "Submit your work"}</CardTitle>
            <CardDescription>
              {a.mySubmissions.length
                ? "Each submission is kept — a new one is added to your history below."
                : "Your leaders will review it and leave feedback here."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubmissionForm
              assignmentId={a.id}
              submissionType={a.submissionType}
              allowedExtensions={ALLOWED_EXTENSIONS}
              maxMb={Math.round(maxUploadBytes() / 1024 / 1024)}
            />
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">Your submissions</h2>
          {a.mySubmissions.length === 0 ? (
            <EmptyState title="Nothing submitted yet" />
          ) : (
            a.mySubmissions.map((s) => <SubmissionCard key={s.id} submission={s} />)
          )}
        </section>

        {manage ? (
          <section className="space-y-4 border-t pt-6">
            <div>
              <h2 className="font-heading text-lg font-semibold">All submissions (review)</h2>
              <p className="text-sm text-muted-foreground">
                {a.allSubmissions.length} submission{a.allSubmissions.length === 1 ? "" : "s"} from {byVolunteer.size} volunteer{byVolunteer.size === 1 ? "" : "s"}. Saving a review notifies the volunteer.
              </p>
            </div>
            {a.allSubmissions.length === 0 ? (
              <EmptyState title="No submissions yet" />
            ) : (
              [...byVolunteer.entries()].map(([userId, list]) => (
                <div key={userId} className="space-y-3">
                  <h3 className="font-medium">{fullName(list[0].user)}</h3>
                  {list.map((s) => (
                    <SubmissionCard key={s.id} submission={s} review />
                  ))}
                </div>
              ))
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
