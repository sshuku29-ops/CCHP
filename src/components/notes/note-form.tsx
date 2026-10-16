"use client";

import Link from "next/link";
import { createNoteAction, updateNoteAction } from "@/lib/notes/actions";
import { toDateInput } from "@/lib/dates";
import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { FieldError } from "@/components/shared/field-error";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type NoteLike = { id: string; title: string; date: Date; attendees: string | null; body: string; summary: string | null };

/**
 * Create / edit form for one meeting note. The body uses the shared rich text
 * editor (writes HTML into a hidden input); the server sanitizes it.
 */
export function NoteForm({ note }: { note?: NoteLike }) {
  const action = note ? updateNoteAction.bind(null, note.id) : createNoteAction;
  return (
    <ActionForm action={action} className="space-y-5">
      {(state) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="note-title">Title</Label>
              <Input id="note-title" name="title" defaultValue={note?.title ?? ""} required maxLength={200} placeholder="Exec board meeting" />
              <FieldError msg={state?.fieldErrors?.title} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note-date">Meeting date</Label>
              <Input id="note-date" name="date" type="date" defaultValue={note ? toDateInput(note.date) : toDateInput(new Date())} required className="sm:w-44" />
              <FieldError msg={state?.fieldErrors?.date} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-attendees">Attendees</Label>
            <Input id="note-attendees" name="attendees" defaultValue={note?.attendees ?? ""} maxLength={1000} placeholder="Sasha, Matt, Papa" />
            <p className="text-xs text-muted-foreground">Names separated by commas — no email addresses needed.</p>
            <FieldError msg={state?.fieldErrors?.attendees} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <RichTextEditor name="body" defaultValue={note?.body} placeholder="Agenda, discussion, decisions…" />
            <FieldError msg={state?.fieldErrors?.body} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note-summary">Summary — decisions &amp; action items (optional)</Label>
            <Textarea id="note-summary" name="summary" rows={4} defaultValue={note?.summary ?? ""} maxLength={5000} placeholder="- Decided: …&#10;- Action: Papa sends emails by Friday" />
            <p className="text-xs text-muted-foreground">Short plain text. This is what shows in the list and in the CSV export.</p>
            <FieldError msg={state?.fieldErrors?.summary} />
          </div>
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <SubmitButton>{note ? "Save changes" : "Save note"}</SubmitButton>
            <Button asChild variant="ghost">
              <Link href={note ? `/notes/${note.id}` : "/notes"}>Cancel</Link>
            </Button>
          </div>
        </>
      )}
    </ActionForm>
  );
}
