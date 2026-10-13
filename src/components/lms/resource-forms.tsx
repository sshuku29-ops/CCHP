"use client";

import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { addResource, updateResource, addVideo } from "@/lib/lms/actions";
import { Field } from "./field";

/** Add a link resource to a module. */
export function ResourceAddForm({ moduleId }: { moduleId: string }) {
  return (
    <ActionForm action={addResource} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end" resetOnSuccess>
      {(state) => (
        <>
          <input type="hidden" name="moduleId" value={moduleId} />
          <Field id="res-label" label="Label" error={state?.fieldErrors?.label}>
            <Input id="res-label" name="label" required maxLength={200} placeholder="Facilitation checklist" />
          </Field>
          <Field id="res-url" label="Link" error={state?.fieldErrors?.url}>
            <Input id="res-url" name="url" type="url" required placeholder="https://…" />
          </Field>
          <SubmitButton size="sm">Add resource</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

/** Inline edit of one existing resource (label + url). */
export function ResourceEditForm({ resource }: { resource: { id: string; label: string; url: string } }) {
  return (
    <ActionForm action={updateResource} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
      {(state) => (
        <>
          <input type="hidden" name="resourceId" value={resource.id} />
          <Field id={`res-${resource.id}-label`} label="Label" error={state?.fieldErrors?.label}>
            <Input id={`res-${resource.id}-label`} name="label" defaultValue={resource.label} required maxLength={200} />
          </Field>
          <Field id={`res-${resource.id}-url`} label="Link" error={state?.fieldErrors?.url}>
            <Input id={`res-${resource.id}-url`} name="url" type="url" defaultValue={resource.url} required />
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
    <ActionForm action={addVideo} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end" resetOnSuccess>
      {(state) => (
        <>
          <input type="hidden" name="moduleId" value={moduleId} />
          <Field id="vid-title" label="Video title" error={state?.fieldErrors?.title}>
            <Input id="vid-title" name="title" required maxLength={200} />
          </Field>
          <Field id="vid-url" label="YouTube link (unlisted)" error={state?.fieldErrors?.youtubeUrl}>
            <Input id="vid-url" name="youtubeUrl" type="url" required placeholder="https://youtu.be/…" />
          </Field>
          <SubmitButton size="sm">Add video</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
