"use client";

import { ActionForm } from "@/components/shared/action-form";
import { submitFeedbackAction } from "@/lib/feedback/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/native-select";
import { FieldError } from "@/components/shared/field-error";
import { FEEDBACK_CATEGORIES } from "@/lib/constants";

const CATEGORY_LABELS: Record<string, string> = {
  IDEA: "Idea",
  ISSUE: "Issue / problem",
  PRAISE: "Praise / shout-out",
  OTHER: "Other",
};

/** Feedback form for everyone. Resets after a successful submit. */
export function SubmitFeedbackForm() {
  return (
    <ActionForm action={submitFeedbackAction} resetOnSuccess className="grid gap-4 sm:grid-cols-[12rem_1fr]">
      {(state, pending) => (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <NativeSelect id="category" name="category" defaultValue="IDEA">
              {FEEDBACK_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
              ))}
            </NativeSelect>
            <FieldError msg={state?.fieldErrors?.category} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">What is on your mind?</Label>
            <Textarea id="body" name="body" rows={4} required minLength={5} maxLength={4000} placeholder="An idea for a session, something that is not working, a thank-you…" />
            <FieldError msg={state?.fieldErrors?.body} />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="anonymous" className="size-4 rounded border-input" />
              Submit anonymously
              <span className="text-xs text-muted-foreground">(your name is never stored with it)</span>
            </label>
            <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send feedback"}</Button>
          </div>
        </>
      )}
    </ActionForm>
  );
}
