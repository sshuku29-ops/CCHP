"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { addResource, updateResource, addVideo } from "@/lib/lms/actions";
import { Field } from "./field";

export type PageOption = { id: string; title: string; category: string };
export type DocumentOption = { id: string; title: string; fileName: string; kind: string };

type ResourceKind = "page" | "document" | "upload";

/**
 * Add a resource to a module. Resources stay on the platform: pick an existing
 * library page, pick an existing library file, or upload a new file (which
 * becomes a Training document attached to this module). No external links.
 */
export function ResourceAddForm({ moduleId, pages, documents }: { moduleId: string; pages: PageOption[]; documents: DocumentOption[] }) {
  const [kind, setKind] = useState<ResourceKind>("page");
  return (
    <ActionForm action={addResource} className="space-y-3" resetOnSuccess>
      {(state) => (
        <>
          <input type="hidden" name="moduleId" value={moduleId} />
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
            <Field id="res-label" label="Label" error={state?.fieldErrors?.label}>
              <Input id="res-label" name="label" required maxLength={200} placeholder="Facilitation checklist" />
            </Field>
            <Field id="res-kind" label="What is it?" error={state?.fieldErrors?.kind}>
              <NativeSelect id="res-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as ResourceKind)}>
                <option value="page">A library page</option>
                <option value="document">A file already in the library</option>
                <option value="upload">Upload a new file</option>
              </NativeSelect>
            </Field>
          </div>

          {kind === "page" ? (
            <Field id="res-page" label="Library page" help="Pages are edited at /library — changes show up here automatically." error={state?.fieldErrors?.pageId}>
              <NativeSelect id="res-page" name="pageId" defaultValue="" required>
                <option value="" disabled>
                  Choose a page…
                </option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : null}

          {kind === "document" ? (
            <Field id="res-doc" label="Library file" error={state?.fieldErrors?.documentId}>
              <NativeSelect id="res-doc" name="documentId" defaultValue="" required>
                <option value="" disabled>
                  Choose a file…
                </option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.fileName})
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : null}

          {kind === "upload" ? (
            <Field id="res-file" label="File" help="PDF, slides, docs or images up to the upload limit. It is stored as a Training handout for this module." error={state?.fieldErrors?.file}>
              <Input id="res-file" name="file" type="file" required accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,.svg" />
            </Field>
          ) : null}

          <SubmitButton size="sm" pendingText={kind === "upload" ? "Uploading…" : "Saving…"}>
            Add resource
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

/** Inline edit of one existing resource's label. */
export function ResourceEditForm({ resource }: { resource: { id: string; label: string } }) {
  return (
    <ActionForm action={updateResource} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
      {(state) => (
        <>
          <input type="hidden" name="resourceId" value={resource.id} />
          <Field id={`res-${resource.id}-label`} label="Label" error={state?.fieldErrors?.label}>
            <Input id={`res-${resource.id}-label`} name="label" defaultValue={resource.label} required maxLength={200} />
          </Field>
          <SubmitButton size="sm" variant="outline">Save</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

/** Add an unlisted YouTube video to a module. The URL is validated with isYouTubeUrl() on the server. */
export function VideoAddForm({ moduleId }: { moduleId: string }) {
  return (
    <ActionForm action={addVideo} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-start" resetOnSuccess>
      {(state) => (
        <>
          <input type="hidden" name="moduleId" value={moduleId} />
          <Field id="vid-title" label="Video title" error={state?.fieldErrors?.title}>
            <Input id="vid-title" name="title" required maxLength={200} />
          </Field>
          <Field
            id="vid-url"
            label="YouTube link"
            help="Paste a YouTube link. Unlisted videos work — only people with the link can watch."
            error={state?.fieldErrors?.youtubeUrl}
          >
            <Input id="vid-url" name="youtubeUrl" type="url" required placeholder="https://www.youtube.com/watch?v=…" />
          </Field>
          <SubmitButton size="sm" className="sm:mt-6">Add video</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
