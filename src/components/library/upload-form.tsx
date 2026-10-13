"use client";

import { uploadLibraryFileAction } from "@/lib/library/actions";
import { LIBRARY_FILE_CATEGORIES, LIBRARY_FILE_CATEGORY_LABELS } from "@/lib/library/categories";
import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { FieldError } from "@/components/shared/field-error";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Admin: upload a PDF / image / doc into the library "Files" list. */
export function LibraryUploadForm() {
  return (
    <ActionForm action={uploadLibraryFileAction} className="grid gap-3 sm:grid-cols-[1fr_12rem_1fr_auto] sm:items-end" resetOnSuccess successMessage="File uploaded.">
      {(state) => (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="file-title">Title (optional)</Label>
            <Input id="file-title" name="title" maxLength={200} placeholder="Defaults to the file name" />
            <FieldError msg={state?.fieldErrors?.title} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="file-category">Category</Label>
            <NativeSelect id="file-category" name="category" defaultValue="TRAINING">
              {LIBRARY_FILE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {LIBRARY_FILE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </NativeSelect>
            <FieldError msg={state?.fieldErrors?.category} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="file-file">File</Label>
            <Input id="file-file" name="file" type="file" required accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,.svg" />
            <FieldError msg={state?.fieldErrors?.file} />
          </div>
          <SubmitButton size="sm" pendingText="Uploading…">Upload</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
