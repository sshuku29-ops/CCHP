import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getLibraryPage, canEditLibrary } from "@/lib/library/queries";
import { LIBRARY_CATEGORY_LABELS, type LibraryCategory } from "@/lib/library/categories";
import { deletePageAction } from "@/lib/library/actions";
import { fmtDate } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { RichText } from "@/components/editor/rich-text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Library" };

/** /library/[slug] — renders one page. Drafts are only visible to admins with the Training module. */
export default async function LibraryPageView(props: PageProps<"/library/[slug]">) {
  const user = await requireUser();
  const canEdit = canEditLibrary(user);
  const { slug } = await props.params;
  const page = await getLibraryPage(slug, { includeUnpublished: canEdit });
  if (!page) notFound();

  return (
    <div className="max-w-3xl">
      <p className="text-sm mb-2">
        <Link href="/library" className="text-muted-foreground hover:underline underline-offset-4">
          ← Library
        </Link>
      </p>
      <PageHeader
        title={page.title}
        description={LIBRARY_CATEGORY_LABELS[page.category as LibraryCategory] ?? page.category}
        actions={
          canEdit ? (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/library/${page.slug}/edit`}>Edit</Link>
              </Button>
              <ConfirmButton action={deletePageAction.bind(null, page.id)} message={`Delete "${page.title}"? Module resources that link to it will lose the link.`} variant="destructive" size="sm">
                Delete
              </ConfirmButton>
            </>
          ) : undefined
        }
      />
      {!page.isPublished ? (
        <Badge variant="outline" className="mb-4">
          Draft — only admins can see this page
        </Badge>
      ) : null}
      <Card>
        <CardContent className="pt-5">
          <RichText source={page.body} />
        </CardContent>
      </Card>
      <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {page.updatedBy ? (
          <>
            <UserAvatar user={page.updatedBy} size="xs" />
            <span>
              Last updated by {page.updatedBy.firstName} {page.updatedBy.lastName} on {fmtDate(page.updatedAt)}
            </span>
          </>
        ) : (
          <span>Last updated on {fmtDate(page.updatedAt)}</span>
        )}
      </p>
    </div>
  );
}
