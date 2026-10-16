"use client";

import { useState } from "react";
import { renderMarkdown } from "@/lib/markdown";
import { saveHandoffContentAction } from "@/lib/handoff/actions";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/editor/rich-text";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";

const SUGGESTED_SECTIONS = ["What this role owns", "Recurring tasks", "Key contacts", "Email templates", "Advice for your successor"];

/**
 * Older handoff docs were written in Markdown. The editor wants HTML, so we
 * convert once when editing starts (renderMarkdown is pure, so it is safe in
 * the browser). Saves are always HTML, sanitized on the server.
 */
function editorValue(stored: string) {
  if (!stored.trim()) return "";
  const isHtml = /^\s*<(p|h\d|ul|ol|div|blockquote|table|pre)[\s>]/i.test(stored);
  return isHtml ? stored : renderMarkdown(stored);
}

/** Read view by default; "Edit" swaps in the shared rich text editor. */
export function HandoffEditor({ docId, content, canEdit }: { docId: string; content: string; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const save = saveHandoffContentAction.bind(null, docId);

  if (!editing) {
    return (
      <div className="space-y-4">
        {canEdit ? (
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
          </div>
        ) : null}
        {content.trim() ? <RichText source={content} /> : <p className="text-sm text-muted-foreground">Nothing written yet.</p>}
      </div>
    );
  }

  return (
    <ActionForm action={save} className="space-y-4" onSuccess={() => setEditing(false)}>
      {(state, pending) => (
        <>
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Suggested sections (use the Heading style in the toolbar):</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {SUGGESTED_SECTIONS.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            <p className="mt-1">Paste email templates as plain text under their own heading so your successor can copy them.</p>
          </div>
          <RichTextEditor name="content" defaultValue={editorValue(content)} minHeight={480} placeholder="What should the next person in this role know?" />
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <div className="flex gap-2">
            <SubmitButton>Save</SubmitButton>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </>
      )}
    </ActionForm>
  );
}
