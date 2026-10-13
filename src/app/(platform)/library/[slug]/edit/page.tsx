import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth/guards";
import { getLibraryPage } from "@/lib/library/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LibraryPageForm } from "@/components/library/page-form";

export const metadata = { title: "Edit library page" };

export default async function EditLibraryPage(props: PageProps<"/library/[slug]/edit">) {
  await requireModule("lms");
  const { slug } = await props.params;
  const page = await getLibraryPage(slug, { includeUnpublished: true });
  if (!page) notFound();

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={`Edit: ${page.title}`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/library/${page.slug}`}>Back to page</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-5">
          <LibraryPageForm page={page} />
        </CardContent>
      </Card>
    </div>
  );
}
