"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { FieldError } from "@/components/shared/field-error";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { removePhotoAction, uploadPhotoAction } from "@/lib/account/actions";

/**
 * Upload / remove a profile photo. Shows a live preview of the chosen file
 * before it is uploaded, and the current photo (or initials) otherwise.
 * Used on /account and on the first-login /welcome page.
 */
export function PhotoForm({
  user,
  compact = false,
}: {
  user: { firstName: string; lastName: string; photoKey: string | null };
  /** Hide the "Remove photo" button (welcome page). */
  compact?: boolean;
}) {
  // Object URL of the file picked in the <input type="file">, for the preview.
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <div className="shrink-0">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview of your new photo" className="size-28 rounded-full object-cover" />
        ) : (
          <UserAvatar user={user} size="xl" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <ActionForm action={uploadPhotoAction} className="space-y-3" onSuccess={() => setPreview(null)} resetOnSuccess>
          {(state, pending) => (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="photo">Profile photo</Label>
                <Input
                  id="photo"
                  name="photo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  required
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setPreview(f ? URL.createObjectURL(f) : null);
                  }}
                />
                <p className="text-xs text-muted-foreground">PNG, JPG, WebP or GIF up to 5 MB. A square photo of your face works best.</p>
                <FieldError msg={state?.fieldErrors?.photo} />
              </div>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Uploading…" : user.photoKey ? "Replace photo" : "Upload photo"}
              </Button>
            </>
          )}
        </ActionForm>

        {!compact && user.photoKey ? (
          <ConfirmButton action={removePhotoAction} message="Remove your profile photo? Your initials will be shown instead." variant="outline" size="sm">
            Remove photo
          </ConfirmButton>
        ) : null}
      </div>
    </div>
  );
}
