import Link from "next/link";
import { requireModule } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LibraryPageForm } from "@/components/library/page-form";

export const metadata = { title: "New library page" };

export default async function NewLibraryPage() {
  await requireModule("lms");
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="New library page"
        description="A page that lives on the platform instead of a Google Doc. Any admin can edit it later."
        actions={
          <Button asChild variant="outline">
            <Link href="/library">Library</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-5">
          <LibraryPageForm />
        </CardContent>
      </Card>
    </div>
  );
}
