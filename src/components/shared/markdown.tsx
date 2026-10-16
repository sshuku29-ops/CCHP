import { renderMarkdown } from "@/lib/markdown";

/** Renders trusted-ish markdown written by signed-in users. HTML is escaped first. */
export function Markdown({ source, className }: { source: string | null | undefined; className?: string }) {
  if (!source) return null;
  return <div className={`prose-cchp ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />;
}
