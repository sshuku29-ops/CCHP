import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth/guards";
import { getCycle } from "@/lib/recruitment/queries";
import { deleteQuestionAction, moveQuestionAction } from "@/lib/recruitment/actions";
import { QUESTION_TYPE_LABELS } from "@/lib/recruitment/helpers";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { ActionButton } from "@/components/recruitment/action-button";
import { QuestionForm } from "@/components/recruitment/question-form";

export const metadata = { title: "Questions" };

/** Ordered list of application questions with add / edit / delete / reorder. */
export default async function QuestionsTab(props: PageProps<"/recruitment/[cycleId]/questions">) {
  await requireModule("recruitment");
  const { cycleId } = await props.params;
  const sp = await props.searchParams;
  const editId = typeof sp.edit === "string" ? sp.edit : null;
  const cycle = await getCycle(cycleId);
  if (!cycle) notFound();
  const hasApplications = cycle._count.applications > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,400px)]">
      <div className="space-y-4">
        {hasApplications ? (
          <Alert>
            <AlertTitle>{cycle._count.applications} application{cycle._count.applications === 1 ? " has" : "s have"} already been submitted</AlertTitle>
            <AlertDescription>
              You can still edit questions, but earlier applicants answered the old wording. Deleting a question also deletes its answers.
            </AlertDescription>
          </Alert>
        ) : null}

        {cycle.questions.length === 0 ? (
          <EmptyState title="No questions yet" description="Add the questions applicants should answer. They appear on the public form in this order." />
        ) : (
          <ol className="space-y-3">
            {cycle.questions.map((q, i) => (
              <li key={q.id}>
                <Card>
                  <CardContent className="py-4">
                    {editId === q.id ? (
                      <QuestionForm cycleId={cycle.id} question={q} />
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {i + 1}. {q.prompt}
                          </p>
                          {q.helpText ? <p className="mt-1 text-sm text-muted-foreground">{q.helpText}</p> : null}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Badge variant="secondary">{QUESTION_TYPE_LABELS[q.type as keyof typeof QUESTION_TYPE_LABELS] ?? q.type}</Badge>
                            <Badge variant="outline">{q.required ? "Required" : "Optional"}</Badge>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1">
                          <ActionButton size="icon-sm" variant="ghost" aria-label="Move up" disabled={i === 0} action={moveQuestionAction.bind(null, q.id, "up")}>
                            ↑
                          </ActionButton>
                          <ActionButton size="icon-sm" variant="ghost" aria-label="Move down" disabled={i === cycle.questions.length - 1} action={moveQuestionAction.bind(null, q.id, "down")}>
                            ↓
                          </ActionButton>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/recruitment/${cycle.id}/questions?edit=${q.id}`}>Edit</Link>
                          </Button>
                          <ConfirmButton
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            message={hasApplications ? "Delete this question AND every answer applicants gave to it?" : "Delete this question?"}
                            action={deleteQuestionAction.bind(null, q.id)}
                          >
                            Delete
                          </ConfirmButton>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Add a question</CardTitle>
          <CardDescription>Video questions ask applicants for an unlisted YouTube link — nothing is uploaded here.</CardDescription>
        </CardHeader>
        <CardContent>
          <QuestionForm cycleId={cycle.id} />
        </CardContent>
      </Card>
    </div>
  );
}
