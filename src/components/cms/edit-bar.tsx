"use client";

import Link from "next/link";
import { useCms } from "./cms-provider";

/**
 * Thin bar at the top of public pages, visible only to signed-in admins.
 * Toggles editing mode: when on, every <Editable> block becomes click-to-edit.
 */
export function EditBar() {
  const { canEdit, editing, setEditing } = useCms();
  if (!canEdit) return null;
  return (
    <div className="no-print sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border-b bg-amber-50 px-4 py-2 text-sm text-amber-950">
      <span>
        {editing
          ? "Editing mode is on — click any highlighted text to change it. Changes go live when you save."
          : "You are signed in as an admin. Turn on editing to change text on this page."}
      </span>
      <span className="flex items-center gap-3">
        <Link href="/site-content" className="underline underline-offset-2">Manage lists (team, partners, resources)</Link>
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className={`rounded-md px-3 py-1 font-medium ${editing ? "bg-amber-900 text-white" : "border border-amber-900/40"}`}
        >
          {editing ? "Done editing" : "Edit this page"}
        </button>
      </span>
    </div>
  );
}
