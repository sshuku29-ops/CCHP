"use client";

import Link from "next/link";
import { createPageAction, updatePageAction } from "@/lib/library/actions";
import { LIBRARY_CATEGORIES, LIBRARY_CATEGORY_LABELS } from "@/lib/library/categories";
import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { FieldError } from "@/components/shared/field-error";
import { NativeSelect } from "@/components/shared/native-select";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PageLike = { id: string; slug: string; title: string; category: string; body: string; isPublished: boolean };

/**
 * Create / edit form for a library page. The body is the shared rich text
 * editor (HTML in a hidden input); the server sanitizes it with cleanHtml().
 */
export function LibraryPageForm({ page }: { page?: PageLike }) {
  const action = page ? updatePageAction.bind(null, page.id) : createPageAction;
  return (
    <ActionForm action={action} className="space-y-5">
      {(state) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
            <div className="space-y-1.5">
              <Label htmlFor="page-title">Title</Label>
              <Input id="page-title" name="title" defaultValue={page?.title ?? ""} required maxLength={200} placeholder="Same-Day Prep Checklist" />
              <FieldError msg={state?.fieldErrors?.title} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="page-category">Category</Label>
              <NativeSelect id="page-category" name="category" defaultValue={page?.category ?? "TRAINING"}>
                {LIBRARY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {LIBRARY_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </NativeSelect>
              <FieldError msg={state?.fieldErrors?.category} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Page content</Label>
            <RichTextEditor name="body" defaultValue={page?.body} placeholder="Write the page…" minHeight={400} />
            <FieldError msg={state?.fieldErrors?.body} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPublished" value="1" defaultChecked={page ? page.isPublished : true} className="size-4 accent-[var(--cchp-green)]" />
            Published (visible to volunteers). Untick to keep it as a draft only admins can see.
          </label>
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <SubmitButton>{page ? "Save changes" : "Create page"}</SubmitButton>
            <Button asChild variant="ghost">
              <Link href={page ? `/library/${page.slug}` : "/library"}>Cancel</Link>
            </Button>
          </div>
        </>
      )}
    </ActionForm>
  );
}
