"use client";

import { ActionForm } from "@/components/shared/action-form";
import { FieldError } from "@/components/shared/field-error";
import { NativeSelect } from "@/components/shared/native-select";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadSessionDocumentAction } from "@/lib/records/actions";

/**
 * Small upload form shown to admins on a session page. The category list is
 * passed in from the server (DOCUMENT_CATEGORIES lives in a server-only file).
 */
export function SessionDocumentUpload({ sessionId, categories }: { sessionId: string; categories: { value: string; label: string }[] }) {
  const action = uploadSessionDocumentAction.bind(null, sessionId);
  return (
    <ActionForm action={action} className="grid gap-3 sm:grid-cols-2" resetOnSuccess>
      {(state) => {
        const err = state?.fieldErrors ?? {};
        return (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="doc-title">Title (optional)</Label>
              <Input id="doc-title" name="title" maxLength={200} placeholder="Defaults to the file name" />
              <FieldError msg={err.title} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-category">Category</Label>
              <NativeSelect id="doc-category" name="category" defaultValue="SESSION_MATERIAL">
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </NativeSelect>
              <FieldError msg={err.category} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="doc-file">File (PDF, image, slides; max 10 MB)</Label>
              <Input id="doc-file" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.ppt,.pptx,.doc,.docx,.txt,.md" required />
              <FieldError msg={err.file} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isPublic" className="size-4 accent-primary" />
                Public (show on the website, e.g. brochures)
              </label>
              <SubmitButton pendingText="Uploading…">Upload file</SubmitButton>
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Photos must show volunteers only. Never upload a photo that includes shelter residents.
            </p>
          </>
        );
      }}
    </ActionForm>
  );
}
