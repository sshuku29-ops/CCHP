import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, CircleX } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getQuizForTaking, getQuizAttemptReview, canManageLms } from "@/lib/lms/queries";
import { fmtDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizTakeForm } from "@/components/lms/quiz-take-form";

export const metadata = { title: "Quiz" };

/**
 * /courses/[courseId]/modules/[moduleId]/quizzes/[quizId]
 * Take the quiz. With ?attempt=<id> it shows the graded review of that attempt instead.
 * The answer key is only loaded for the review (after grading), never for the taking form.
 */
export default async function QuizPage(props: PageProps<"/courses/[courseId]/modules/[moduleId]/quizzes/[quizId]">) {
  const user = await requireUser();
  const { courseId, moduleId, quizId } = await props.params;
  const { attempt: attemptParam } = await props.searchParams;
  const quiz = await getQuizForTaking(courseId, moduleId, quizId, user);
  if (!quiz) notFound();
  const manage = canManageLms(user);
  const base = `/courses/${courseId}/modules/${moduleId}`;
  const attemptId = typeof attemptParam === "string" ? attemptParam : null;
  const review = attemptId ? await getQuizAttemptReview(quiz.id, attemptId, user) : null;

  return (
    <div className="max-w-3xl">
      <p className="text-sm mb-2">
        <Link href={base} className="text-muted-foreground hover:underline underline-offset-4">
          ← {quiz.module.title}
        </Link>
      </p>
      <PageHeader
        title={quiz.title}
        description={quiz.description ?? quiz.module.course.title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {quiz.best ? <StatusBadge status={quiz.best.passed ? "DONE" : "NEEDS_REVISION"} label={quiz.best.passed ? "Passed" : "Not passed yet"} /> : null}
            <Badge variant="secondary">Pass mark {quiz.passPercent}%</Badge>
            {manage ? (
              <>
                <Button asChild size="sm" variant="outline">
                  <Link href={`${base}/quizzes/${quiz.id}/edit`}>Edit questions</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`${base}/quizzes/${quiz.id}/results`}>Results</Link>
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      <div className="space-y-6">
        {review ? (
          /* ── Graded review of one attempt ── */
          <>
            <Card className={review.passed ? "border-emerald-300" : "border-amber-300"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {review.passed ? <CircleCheck className="size-5 text-emerald-600" /> : <CircleX className="size-5 text-amber-600" />}
                  {review.passed ? "You passed!" : "Not quite — try again"}
                </CardTitle>
                <CardDescription>
                  You scored {review.score} out of {review.total} ({review.percent}%). Pass mark is {review.quiz.passPercent}%. Taken {fmtDateTime(review.createdAt)}.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={`${base}/quizzes/${quiz.id}`}>{review.passed ? "Retake quiz" : "Try again"}</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={base}>Back to module</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Review your answers</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-5">
                  {review.questions.map((q, i) => {
                    const correct = q.chosenIndex === q.correctIndex;
                    return (
                      <li key={q.id} className="space-y-2">
                        <p className="font-medium flex items-start gap-2">
                          {correct ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" />}
                          <span>
                            <span className="text-muted-foreground mr-2">{i + 1}.</span>
                            {q.prompt}
                          </span>
                        </p>
                        <ul className="space-y-1 pl-6 text-sm">
                          {q.options.map((opt, j) => {
                            const isCorrect = j === q.correctIndex;
                            const isChosen = j === q.chosenIndex;
                            return (
                              <li
                                key={j}
                                className={
                                  "rounded-md border px-3 py-1.5 " +
                                  (isCorrect ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20" : isChosen ? "border-destructive/50 bg-destructive/5" : "border-transparent")
                                }
                              >
                                {opt}
                                {isCorrect ? <span className="ml-2 text-xs text-emerald-700">Correct answer</span> : null}
                                {isChosen && !isCorrect ? <span className="ml-2 text-xs text-destructive">Your answer</span> : null}
                                {isChosen && isCorrect ? <span className="ml-2 text-xs text-emerald-700">(your answer)</span> : null}
                              </li>
                            );
                          })}
                          {q.chosenIndex === null ? <li className="text-xs text-muted-foreground">You did not answer this question.</li> : null}
                        </ul>
                        {q.explanation ? <p className="pl-6 text-sm text-muted-foreground">{q.explanation}</p> : null}
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>
          </>
        ) : quiz.questions.length === 0 ? (
          <EmptyState
            title="This quiz has no questions yet"
            description={manage ? "Add questions in the editor, then volunteers can take it." : "Check back soon."}
            action={
              manage ? (
                <Button asChild size="sm">
                  <Link href={`${base}/quizzes/${quiz.id}/edit`}>Add questions</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          /* ── Taking the quiz ── */
          <Card>
            <CardHeader>
              <CardTitle>
                {quiz.questions.length} question{quiz.questions.length === 1 ? "" : "s"}
              </CardTitle>
              <CardDescription>Choose one answer per question. You will see which ones you got right as soon as you submit.</CardDescription>
            </CardHeader>
            <CardContent>
              <QuizTakeForm quizId={quiz.id} questions={quiz.questions} />
            </CardContent>
          </Card>
        )}

        {/* ── Your attempt history ── */}
        {quiz.attempts.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Your attempts</CardTitle>
              <CardDescription>Only your best attempt counts. Retake as often as you like.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {quiz.attempts.map((a) => (
                  <li key={a.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{fmtDateTime(a.createdAt)}</span>
                    <span className="flex items-center gap-2">
                      <span>
                        {a.score}/{a.total} · {a.percent}%
                      </span>
                      <StatusBadge status={a.passed ? "DONE" : "NEEDS_REVISION"} label={a.passed ? "Passed" : "Not passed"} />
                      <Link href={`${base}/quizzes/${quiz.id}?attempt=${a.id}`} className="underline underline-offset-4">
                        Review
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
