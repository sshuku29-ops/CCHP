"use client";

import { useState } from "react";
import { renderMarkdown } from "@/lib/markdown";
import { saveHandoffContentAction } from "@/lib/handoff/actions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/shared/markdown";
import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";

const TEMPLATE_HINT = [
  "## What this role owns",
  "## Recurring tasks",
  "## Key contacts",
  "## Email templates",
  "## Advice for your successor",
];

/**
 * Read view by default. "Edit" swaps in a markdown textarea with a live
 * preview beside it. `renderMarkdown` is a pure function, so running it in
 * the browser is safe and gives instant feedback.
 */
export function HandoffEditor({ docId, content, canEdit }: { docId: string; content: string; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const save = saveHandoffContentAction.bind(null, docId);

  if (!editing) {
    return (
      <div className="space-y-4">
        {canEdit ? (
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => { setDraft(content); setEditing(true); }}>Edit</Button>
          </div>
        ) : null}
        {content.trim() ? <Markdown source={content} /> : <p className="text-sm text-muted-foreground">Nothing written yet.</p>}
      </div>
    );
  }

  return (
    <ActionForm action={save} className="space-y-4" onSuccess={() => setEditing(false)}>
      {(state, pending) => (
        <>
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Suggested sections (markdown headings):</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {TEMPLATE_HINT.map((h) => (
                <li key={h}><code>{h}</code></li>
              ))}
            </ul>
            <p className="mt-1">Use <code>**bold**</code>, <code>- bullets</code>, and <code>[links](https://…)</code>. Paste email templates as plain text under a heading.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Markdown</p>
              <Textarea
                name="content"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-[60vh] font-mono text-sm"
                spellCheck
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
              <div className="rounded-lg border p-4 min-h-[60vh] overflow-auto">
                <div className="prose-cchp" dangerouslySetInnerHTML={{ __html: renderMarkdown(draft) }} />
              </div>
            </div>
          </div>
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
