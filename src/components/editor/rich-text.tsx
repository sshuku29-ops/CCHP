import { looksLikeHtml } from "@/lib/html/sanitize";
import { renderMarkdown } from "@/lib/markdown";

/**
 * Renders stored content. New content is sanitized HTML from the editor;
 * older content may still be Markdown, which is rendered the old way.
 * HTML is sanitized on write (cleanHtml), so it is safe to inject here.
 */
export function RichText({ source, className }: { source: string | null | undefined; className?: string }) {
  if (!source) return null;
  const html = looksLikeHtml(source) ? source : renderMarkdown(source);
  return <div className={`prose-cchp ql-content ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
