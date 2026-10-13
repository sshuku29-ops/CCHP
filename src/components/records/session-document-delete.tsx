"use client";

import { toast } from "sonner";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { deleteSessionDocumentAction } from "@/lib/records/actions";

/** "Delete" button for one uploaded file on a session page (asks for confirmation first). */
export function SessionDocumentDelete({ sessionId, documentId, title }: { sessionId: string; documentId: string; title: string }) {
  return (
    <ConfirmButton
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      message={`Delete "${title}"? The file is removed permanently.`}
      action={async () => {
        const res = await deleteSessionDocumentAction(sessionId, documentId);
        if (res?.ok) toast.success("File deleted.");
        return res;
      }}
    >
      Delete
    </ConfirmButton>
  );
}
