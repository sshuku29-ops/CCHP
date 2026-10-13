"use client";

import { useEffect, useRef, useState, useTransition, type ElementType } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveContent } from "@/lib/cms/actions";
import { useCms } from "./cms-provider";

type Props = {
  k: string;
  value: string;
  as?: ElementType;
  className?: string;
  /** Allow line breaks (paragraphs). Single-line blocks save on Enter. */
  multiline?: boolean;
};

/**
 * Renders a piece of site text. When an admin has editing mode on, the text
 * gets an outline; clicking it turns it into a plain-text editor with
 * Save / Cancel. Enter saves single-line blocks; Esc cancels.
 */
export function EditableText({ k, value, as, className, multiline }: Props) {
  const Tag = (as ?? "span") as ElementType;
  const { editing: mode } = useCms();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLElement | null>(null);

  // Place the caret at the end when the editor opens.
  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      const sel = window.getSelection();
      if (sel && ref.current.childNodes.length) {
        const range = document.createRange();
        range.selectNodeContents(ref.current);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, [editing]);

  if (!mode) {
    return <Tag className={className}>{value}</Tag>;
  }

  const save = () => {
    const next = (ref.current?.innerText ?? value).trim();
    if (next === value) {
      setEditing(false);
      return;
    }
    start(async () => {
      const res = await saveContent(k, next);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Saved");
        setEditing(false);
        router.refresh();
      }
    });
  };
  const cancel = () => setEditing(false);

  if (!editing) {
    return (
      <Tag
        className={`${className ?? ""} cms-hot`}
        title="Click to edit"
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setEditing(true);
        }}
      >
        {value}
      </Tag>
    );
  }

  return (
    <span className="cms-editing-wrap">
      <Tag
        ref={ref}
        className={`${className ?? ""} cms-editing`}
        contentEditable="plaintext-only"
        suppressContentEditableWarning
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          } else if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            save();
          }
        }}
      >
        {value}
      </Tag>
      <span className="cms-toolbar">
        <button type="button" onClick={save} disabled={pending} className="cms-btn cms-btn-primary">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={cancel} disabled={pending} className="cms-btn">
          Cancel
        </button>
        <span className="cms-hint">{multiline ? "⌘/Ctrl+Enter to save · Esc to cancel" : "Enter to save · Esc to cancel"}</span>
      </span>
    </span>
  );
}
