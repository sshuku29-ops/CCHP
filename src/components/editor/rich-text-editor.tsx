"use client";

import { useEffect, useRef } from "react";
import type Quill from "quill";
import "quill/dist/quill.snow.css";

/**
 * Basic rich text editor (Quill) used for meeting notes, handoff docs, module
 * instructions, library pages and profiles. It writes HTML into a hidden
 * input named `name`, so it works inside ordinary server-action <form>s.
 * The server MUST run the HTML through cleanHtml() before saving.
 */
export function RichTextEditor({
  name,
  defaultValue,
  placeholder,
  minHeight = 320,
}: {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  minHeight?: number;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const quill = useRef<Quill | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { default: QuillCtor } = await import("quill");
      if (cancelled || !holder.current || quill.current) return;
      // Register extra font sizes and fonts (basic pack).
      const Size = QuillCtor.import("attributors/style/size") as { whitelist: string[] };
      Size.whitelist = ["12px", "14px", "16px", "18px", "20px", "24px", "32px"];
      QuillCtor.register(Size as never, true);
      const Font = QuillCtor.import("attributors/style/font") as { whitelist: string[] };
      Font.whitelist = ["sans-serif", "serif", "monospace"];
      QuillCtor.register(Font as never, true);

      const q = new QuillCtor(holder.current, {
        theme: "snow",
        placeholder,
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            [{ font: Font.whitelist }, { size: Size.whitelist }],
            ["bold", "italic", "underline", "strike"],
            [{ color: [] }, { background: [] }],
            [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
            [{ align: [] }],
            ["blockquote", "link"],
            ["clean"],
          ],
        },
      });
      if (defaultValue) {
        const delta = q.clipboard.convert({ html: defaultValue });
        q.setContents(delta, "silent");
      }
      const sync = () => {
        if (input.current) input.current.value = q.getSemanticHTML();
      };
      sync();
      q.on("text-change", sync);
      quill.current = q;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rte rounded-lg border bg-background">
      <div ref={holder} style={{ minHeight }} />
      <input ref={input} type="hidden" name={name} defaultValue={defaultValue ?? ""} />
    </div>
  );
}
