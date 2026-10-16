"use client";

import { ActionForm } from "@/components/shared/action-form";
import { FieldError } from "@/components/shared/field-error";
import { SubmitButton } from "@/components/shared/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { fmtDateTime } from "@/lib/dates";
import { addTaskComment } from "@/lib/projects/actions";

type Comment = {
  id: string;
  body: string;
  createdAt: Date;
  author: { id: string; firstName: string; lastName: string } | null;
};

/** Comment thread + "add a comment" box. */
export function TaskComments({ taskId, comments, currentUserId }: { taskId: string; comments: Comment[]; currentUserId: string }) {
  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Use comments for status notes and questions.</p>
      ) : (
        <ol className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="mb-1 flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {c.author ? `${c.author.firstName} ${c.author.lastName}` : "Former member"}
                  {c.author?.id === currentUserId ? " (you)" : ""}
                </span>
                <time dateTime={new Date(c.createdAt).toISOString()}>{fmtDateTime(new Date(c.createdAt))}</time>
              </div>
              <p className="whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ol>
      )}
      <ActionForm action={addTaskComment.bind(null, taskId)} resetOnSuccess className="space-y-2">
        {(state) => (
          <>
            <Textarea name="body" rows={3} placeholder="Add a comment…" required maxLength={4000} />
            <FieldError msg={state?.fieldErrors?.body} />
            {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            <SubmitButton size="sm" pendingText="Posting…">
              Post comment
            </SubmitButton>
          </>
        )}
      </ActionForm>
    </div>
  );
}
