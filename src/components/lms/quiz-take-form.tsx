"use client";

import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { FieldError } from "@/components/shared/field-error";
import { submitQuizAttempt } from "@/lib/lms/actions";

type Question = { id: string; prompt: string; options: string[] };

/**
 * The quiz-taking form. Each question is a group of radios named q_<questionId>.
 * Grading happens in the server action; this component never sees the answer key.
 */
export function QuizTakeForm({ quizId, questions }: { quizId: string; questions: Question[] }) {
  return (
    <ActionForm action={submitQuizAttempt} className="space-y-6">
      {(state) => (
        <>
          <input type="hidden" name="quizId" value={quizId} />
          <ol className="space-y-6">
            {questions.map((q, i) => (
              <li key={q.id}>
                <fieldset className="space-y-2">
                  <legend className="font-medium">
                    <span className="text-muted-foreground mr-2">{i + 1}.</span>
                    {q.prompt}
                  </legend>
                  {q.options.map((opt, j) => (
                    <label key={j} className="flex items-start gap-2 rounded-lg border p-3 text-sm cursor-pointer hover:bg-muted/40 has-checked:border-primary has-checked:bg-primary/5">
                      <input type="radio" name={`q_${q.id}`} value={j} required className="mt-0.5 size-4 accent-primary shrink-0" />
                      <span>{opt}</span>
                    </label>
                  ))}
                  <FieldError msg={state?.fieldErrors?.[`q_${q.id}`]} />
                </fieldset>
              </li>
            ))}
          </ol>
          <SubmitButton pendingText="Grading…">Submit answers</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
