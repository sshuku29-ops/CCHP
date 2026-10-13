import Link from "next/link";
import { requireModule } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NoteForm } from "@/components/notes/note-form";

export const metadata = { title: "New meeting note" };

export default async function NewNotePage() {
  await requireModule("projects");
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="New meeting note"
        actions={
          <Button asChild variant="outline">
            <Link href="/notes">All notes</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-5">
          <NoteForm />
        </CardContent>
      </Card>
    </div>
  );
}
