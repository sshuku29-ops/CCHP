import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronUp, ChevronDown } from "lucide-react";
import { requireModule } from "@/lib/auth/guards";
import { getQuizForEditing } from "@/lib/lms/queries";
import { deleteQuiz, deleteQuestion, moveQuestion } from "@/lib/lms/actions";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizForm, QuestionForm } from "@/components/lms/quiz-forms";

export const metadata = { title: "Edit quiz" };

/** /courses/[courseId]/modules/[moduleId]/quizzes/[quizId]/edit — admin question editor. */
export default async function QuizEditPage(props: PageProps<"/courses/[courseId]/modules/[moduleId]/quizzes/[quizId]/edit">) {
  await requireModule("lms");
  const { courseId, moduleId, quizId } = await props.params;
  const quiz = await getQuizForEditing(courseId, moduleId, quizId);
  if (!quiz) notFound();
  const base = `/courses/${courseId}/modules/${moduleId}`;

  return (
    <div className="max-w-3xl">
      <p className="text-sm mb-2">
        <Link href={base} className="text-muted-foreground hover:underline underline-offset-4">
          ← {quiz.module.title}
        </Link>
      </p>
      <PageHeader
        title={`Edit quiz: ${quiz.title}`}
        description={quiz.module.course.title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {quiz.questions.length} question{quiz.questions.length === 1 ? "" : "s"}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <Link href={`${base}/quizzes/${quiz.id}`}>Preview</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`${base}/quizzes/${quiz.id}/results`}>Results</Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <details className="rounded-xl border bg-card">
          <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium">Edit quiz details (title, description, pass mark)</summary>
          <div className="border-t px-5 py-4">
            <QuizForm moduleId={quiz.moduleId} quiz={quiz} />
          </div>
        </details>

        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
            <CardDescription>
              {quiz.questions.length === 0
                ? "No questions yet. Add the first one below."
                : quiz._count.attempts > 0
                  ? `${quiz._count.attempts} attempt${quiz._count.attempts === 1 ? "" : "s"} recorded so far — changing questions does not re-grade old attempts.`
                  : "Use the arrows to reorder."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quiz.questions.map((q, i) => (
              <div key={q.id} className="rounded-lg border p-3 sm:p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">
                    <span className="text-muted-foreground mr-2">{i + 1}.</span>
                    {q.prompt}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    <form action={moveQuestion.bind(null, q.id, "up")}>
                      <Button type="submit" size="icon-sm" variant="ghost" disabled={i === 0} aria-label="Move up">
                        <ChevronUp />
                      </Button>
                    </form>
                    <form action={moveQuestion.bind(null, q.id, "down")}>
                      <Button type="submit" size="icon-sm" variant="ghost" disabled={i === quiz.questions.length - 1} aria-label="Move down">
                        <ChevronDown />
                      </Button>
                    </form>
                    <ConfirmButton action={deleteQuestion.bind(null, q.id)} message="Delete this question?" size="xs" variant="ghost" className="text-destructive">
                      Delete
                    </ConfirmButton>
                  </div>
                </div>
                <details>
                  <summary className="cursor-pointer select-none text-xs text-muted-foreground">Edit question</summary>
                  <div className="pt-3">
                    <QuestionForm quizId={quiz.id} question={q} />
                  </div>
                </details>
              </div>
            ))}

            <div className="rounded-lg border border-dashed p-3 sm:p-4">
              <p className="text-sm font-medium mb-3">Add a question</p>
              <QuestionForm quizId={quiz.id} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>Deleting the quiz also deletes every attempt at it.</CardDescription>
          </CardHeader>
          <CardContent>
            <ConfirmButton action={deleteQuiz.bind(null, quiz.id)} message={`Delete the quiz "${quiz.title}" and every attempt at it?`} variant="destructive" size="sm">
              Delete quiz
            </ConfirmButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
