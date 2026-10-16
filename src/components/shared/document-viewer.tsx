/**
 * Inline viewer for a stored Document (see src/lib/documents/index.ts).
 *
 *  - PDFs open in a collapsible <details> with the file in an <iframe>, so a
 *    page with several PDFs does not load them all at once. The first one on
 *    a page is usually passed `defaultOpen` so people see something right away.
 *  - Images show as a thumbnail; clicking opens the full-size file in a new tab.
 *  - Anything else (Word, PowerPoint, text) gets a download link.
 *
 * Files are always served through /api/files/[key], which checks access.
 * Usage: <DocumentViewer doc={{ fileKey, kind, title, fileName }} defaultOpen />
 */
export type ViewerDoc = {
  fileKey: string;
  kind: string; // PDF | IMAGE | OTHER
  title: string;
  fileName: string;
};

export function DocumentViewer({ doc, defaultOpen = false }: { doc: ViewerDoc; defaultOpen?: boolean }) {
  const url = `/api/files/${doc.fileKey}`;

  if (doc.kind === "PDF") {
    return (
      <details open={defaultOpen} className="group rounded-lg border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium">
          <span className="min-w-0 truncate">{doc.title}</span>
          <span aria-hidden="true" className="shrink-0 text-xs font-normal text-muted-foreground transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="border-t">
          <div className="flex justify-end px-4 py-1.5">
            <a href={`${url}?download=1`} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
              Download PDF
            </a>
          </div>
          <iframe src={url} title={doc.title} className="w-full h-[70vh]" />
        </div>
      </details>
    );
  }

  if (doc.kind === "IMAGE") {
    return (
      <figure className="rounded-lg border bg-card p-3">
        <a href={url} target="_blank" rel="noopener noreferrer" className="block" title="Open full size">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={doc.title} className="mx-auto max-h-64 w-auto rounded-md object-contain" loading="lazy" />
        </a>
        <figcaption className="mt-2 flex items-center justify-between gap-3 text-sm">
          <span className="min-w-0 truncate">{doc.title}</span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Full size
          </a>
        </figcaption>
      </figure>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm">
      <span className="min-w-0 truncate">{doc.title}</span>
      <a href={`${url}?download=1`} className="shrink-0 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
        Download {doc.fileName.split(".").pop()?.toUpperCase()}
      </a>
    </div>
  );
}
