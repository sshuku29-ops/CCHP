import Link from "next/link";
import { FileText, Image as ImageIcon, File as FileIcon } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { listLibraryPages, listLibraryFiles, canEditLibrary } from "@/lib/library/queries";
import { LIBRARY_CATEGORY_LABELS, LIBRARY_FILE_CATEGORY_LABELS, type LibraryCategory, type LibraryFileCategory } from "@/lib/library/categories";
import { deleteLibraryFileAction } from "@/lib/library/actions";
import { documentUrl } from "@/lib/documents";
import { fmtDate } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LibraryUploadForm } from "@/components/library/upload-form";

export const metadata = { title: "Library" };

function kindIcon(kind: string) {
  if (kind === "PDF") return <FileText className="size-4 text-muted-foreground shrink-0" />;
  if (kind === "IMAGE") return <ImageIcon className="size-4 text-muted-foreground shrink-0" />;
  return <FileIcon className="size-4 text-muted-foreground shrink-0" />;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * /library — every signed-in user can read. Pages grouped by category with a
 * search box, then uploaded files (training handouts + general files).
 * Admins with the Training module get New page / Upload / Remove controls.
 */
export default async function LibraryPage(props: PageProps<"/library">) {
  const user = await requireUser();
  const canEdit = canEditLibrary(user);
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const [{ groups, total }, files] = await Promise.all([listLibraryPages({ q, includeUnpublished: canEdit }), listLibraryFiles()]);

  return (
    <div>
      <PageHeader
        title="Library"
        description="Training handouts, templates, checklists and guides — all on the platform, editable by any admin."
        actions={
          canEdit ? (
            <Button size="sm" asChild>
              <Link href="/library/new">New page</Link>
            </Button>
          ) : undefined
        }
      />

      <form action="/library" method="get" className="mb-6 flex w-full max-w-md gap-2">
        <Input name="q" defaultValue={q} placeholder="Search pages…" aria-label="Search library" />
        <Button type="submit" variant="outline">Search</Button>
        {q ? (
          <Button variant="ghost" asChild>
            <Link href="/library">Clear</Link>
          </Button>
        ) : null}
      </form>

      {total === 0 ? (
        <EmptyState
          title={q ? "No pages match." : "No pages yet."}
          description={q ? "Try another word." : canEdit ? "Create the first page — a checklist, a template, a how-to." : "Admins have not added any pages yet."}
          action={
            canEdit ? (
              <Button asChild>
                <Link href="/library/new">New page</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((g) => (
            <Card key={g.category}>
              <CardHeader>
                <CardTitle>{LIBRARY_CATEGORY_LABELS[g.category as LibraryCategory] ?? g.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {g.pages.map((p) => (
                    <li key={p.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/library/${p.slug}`} className="font-medium hover:underline underline-offset-4">
                        {p.title}
                      </Link>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {!p.isPublished ? <Badge variant="outline">Draft</Badge> : null}
                        <span>Updated {fmtDate(p.updatedAt)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Files ── */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Files</CardTitle>
          <CardDescription>Uploaded handouts and other files. They open in a new tab; PDFs and images show right in the browser.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
          ) : (
            <ul className="divide-y">
              {files.map((f) => (
                <li key={f.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {kindIcon(f.kind)}
                    <div className="min-w-0">
                      <a href={documentUrl(f)} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline underline-offset-4">
                        {f.title}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        {LIBRARY_FILE_CATEGORY_LABELS[f.category as LibraryFileCategory] ?? f.category} · {f.fileName} · {fmtSize(f.size)}
                        {f.module ? (
                          <>
                            {" · "}
                            <Link href={`/courses/${f.module.courseId}/modules/${f.module.id}`} className="hover:underline">
                              {f.module.title}
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button asChild size="sm" variant="outline">
                      <a href={documentUrl(f)} target="_blank" rel="noopener noreferrer">
                        Open
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <a href={`${documentUrl(f)}?download=1`}>Download</a>
                    </Button>
                    {canEdit ? (
                      <ConfirmButton action={deleteLibraryFileAction.bind(null, f.id)} message={`Remove "${f.title}" from the library?`} size="sm" variant="ghost" className="text-destructive">
                        Remove
                      </ConfirmButton>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {canEdit ? (
            <div className="rounded-lg border border-dashed p-3 sm:p-4">
              <p className="text-sm font-medium mb-3">Upload a file</p>
              <LibraryUploadForm />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
