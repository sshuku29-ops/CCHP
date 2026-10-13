"use client";

import { ExternalLink, X } from "lucide-react";
import { ActionForm } from "@/components/shared/action-form";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { FieldError } from "@/components/shared/field-error";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { addTaskLink, removeTaskLink } from "@/lib/projects/actions";

/** Links / resources attached to a task. Admins can add and remove. */
export function TaskLinks({ taskId, links, canEdit }: { taskId: string; links: { id: string; label: string; url: string }[]; canEdit: boolean }) {
  return (
    <div className="space-y-3">
      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No links yet.</p>
      ) : (
        <ul className="space-y-1">
          {links.map((l) => (
            <li key={l.id} className="flex items-center gap-2 text-sm">
              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="truncate underline underline-offset-2 hover:text-primary">
                {l.label}
              </a>
              {canEdit ? (
                <ConfirmButton action={removeTaskLink.bind(null, l.id)} message={`Remove the link “${l.label}”?`} variant="ghost" size="icon" className="ml-auto size-6" aria-label="Remove link">
                  <X className="size-3.5" />
                </ConfirmButton>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <ActionForm action={addTaskLink.bind(null, taskId)} resetOnSuccess successMessage="Link added.">
          {(state) => (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="sm:w-40">
                <Input name="label" placeholder="Label" aria-label="Link label" required maxLength={120} />
                <FieldError msg={state?.fieldErrors?.label} />
              </div>
              <div className="flex-1">
                <Input name="url" type="url" placeholder="https://…" aria-label="Link URL" required />
                <FieldError msg={state?.fieldErrors?.url} />
              </div>
              <SubmitButton size="sm" variant="outline" className="h-8" pendingText="Adding…">
                Add link
              </SubmitButton>
            </div>
          )}
        </ActionForm>
      ) : null}
    </div>
  );
}
