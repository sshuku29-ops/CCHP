import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth/guards";
import { getMeetingNote } from "@/lib/notes/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NoteForm } from "@/components/notes/note-form";

export const metadata = { title: "Edit meeting note" };

export default async function EditNotePage(props: PageProps<"/notes/[id]/edit">) {
  await requireModule("projects");
  const { id } = await props.params;
  const note = await getMeetingNote(id);
  if (!note) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Edit meeting note"
        actions={
          <Button asChild variant="outline">
            <Link href={`/notes/${note.id}`}>Back to note</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-5">
          <NoteForm note={note} />
        </CardContent>
      </Card>
    </div>
  );
}
