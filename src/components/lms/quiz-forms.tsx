"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createQuiz, updateQuiz, addQuestion, updateQuestion } from "@/lib/lms/actions";
import { Field } from "./field";

type QuizLike = { id: string; title: string; description: string | null; passPercent: number };

/** Create a quiz (no `quiz` prop) or edit its title / description / pass mark. Admins only (checked server-side). */
export function QuizForm({ moduleId, quiz }: { moduleId: string; quiz?: QuizLike }) {
  const editing = !!quiz;
  const p = quiz ? `quiz-${quiz.id}-` : "quiz-new-";
  return (
    <ActionForm action={editing ? updateQuiz : createQuiz} className="space-y-3">
      {(state) => (
        <>
          {quiz ? <input type="hidden" name="quizId" value={quiz.id} /> : <input type="hidden" name="moduleId" value={moduleId} />}
          <Field id={`${p}title`} label="Quiz title" error={state?.fieldErrors?.title}>
            <Input id={`${p}title`} name="title" defaultValue={quiz?.title ?? ""} required maxLength={200} placeholder="Week 1 knowledge check" />
          </Field>
          <Field id={`${p}description`} label="Description (optional)" error={state?.fieldErrors?.description}>
            <Textarea id={`${p}description`} name="description" rows={2} defaultValue={quiz?.description ?? ""} placeholder="What this quiz covers, and any tips." />
          </Field>
          <Field id={`${p}pass`} label="Pass mark (%)" help="Volunteers need at least this percentage to pass." error={state?.fieldErrors?.passPercent}>
            <Input id={`${p}pass`} name="passPercent" type="number" min={0} max={100} step={1} defaultValue={quiz?.passPercent ?? 70} required className="max-w-32" />
          </Field>
          <SubmitButton size="sm" variant={editing ? "outline" : "default"}>
            {editing ? "Save quiz" : "Create quiz"}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

type QuestionLike = { id: string; prompt: string; options: string[]; correctIndex: number; explanation: string | null };

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

/**
 * Add a question (no `question` prop) or edit an existing one.
 * Options are separate inputs (option0 … option5) and a radio picks the correct one.
 * The only client state is how many option rows to show.
 */
export function QuestionForm({ quizId, question }: { quizId: string; question?: QuestionLike }) {
  const editing = !!question;
  const p = question ? `q-${question.id}-` : "q-new-";
  const [count, setCount] = useState(Math.min(MAX_OPTIONS, Math.max(MIN_OPTIONS, question?.options.length ?? 3)));

  return (
    <ActionForm action={editing ? updateQuestion : addQuestion} className="space-y-3" resetOnSuccess={!editing}>
      {(state) => (
        <>
          {question ? <input type="hidden" name="questionId" value={question.id} /> : <input type="hidden" name="quizId" value={quizId} />}
          <Field id={`${p}prompt`} label="Question" error={state?.fieldErrors?.prompt}>
            <Textarea id={`${p}prompt`} name="prompt" rows={2} defaultValue={question?.prompt ?? ""} required maxLength={2000} placeholder="What should you do first when…?" />
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Answer options</legend>
            <p className="text-xs text-muted-foreground">Fill in 2–6 options and tick the circle next to the correct one.</p>
            {Array.from({ length: count }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correctIndex"
                  value={i}
                  defaultChecked={(question?.correctIndex ?? 0) === i}
                  aria-label={`Option ${i + 1} is the correct answer`}
                  className="size-4 accent-primary shrink-0"
                />
                <Input
                  name={`option${i}`}
                  defaultValue={question?.options[i] ?? ""}
                  required={i < MIN_OPTIONS}
                  maxLength={500}
                  placeholder={`Option ${i + 1}`}
                  aria-label={`Option ${i + 1}`}
                />
              </div>
            ))}
            {state?.fieldErrors?.options ? <p className="text-sm text-destructive">{state.fieldErrors.options}</p> : null}
            {state?.fieldErrors?.correctIndex ? <p className="text-sm text-destructive">{state.fieldErrors.correctIndex}</p> : null}
            <div className="flex gap-2">
              <Button type="button" size="xs" variant="outline" onClick={() => setCount((c) => Math.min(MAX_OPTIONS, c + 1))} disabled={count >= MAX_OPTIONS}>
                + Add option
              </Button>
              <Button type="button" size="xs" variant="ghost" onClick={() => setCount((c) => Math.max(MIN_OPTIONS, c - 1))} disabled={count <= MIN_OPTIONS}>
                Remove last option
              </Button>
            </div>
          </fieldset>

          <Field
            id={`${p}explanation`}
            label="Explanation (optional)"
            help="Shown after the quiz is graded, next to the correct answer."
            error={state?.fieldErrors?.explanation}
          >
            <Textarea id={`${p}explanation`} name="explanation" rows={2} defaultValue={question?.explanation ?? ""} maxLength={2000} />
          </Field>

          <SubmitButton size="sm" variant={editing ? "outline" : "default"}>
            {editing ? "Save question" : "Add question"}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
