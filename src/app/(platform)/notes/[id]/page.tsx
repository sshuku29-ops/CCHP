import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth/guards";
import { getMeetingNote, canDeleteNote } from "@/lib/notes/queries";
import { deleteNoteAction } from "@/lib/notes/actions";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { RichText } from "@/components/editor/rich-text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Meeting note" };

export default async function NotePage(props: PageProps<"/notes/[id]">) {
  const user = await requireModule("projects");
  const { id } = await props.params;
  const note = await getMeetingNote(id);
  if (!note) notFound();
  const canDelete = canDeleteNote(user, note);

  return (
    <div className="max-w-3xl">
      <p className="text-sm mb-2">
        <Link href="/notes" className="text-muted-foreground hover:underline underline-offset-4">
          ← All notes
        </Link>
      </p>
      <PageHeader
        title={note.title}
        description={`${fmtDate(note.date)}${note.attendees ? ` · ${note.attendees}` : ""}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/notes/${note.id}/edit`}>Edit</Link>
            </Button>
            {canDelete ? (
              <ConfirmButton action={deleteNoteAction.bind(null, note.id)} message={`Delete "${note.title}"? This cannot be undone.`} variant="destructive" size="sm">
                Delete
              </ConfirmButton>
            ) : null}
          </>
        }
      />

      {note.summary ? (
        <Card className="mb-6 border-[var(--cchp-green)]/30 bg-[var(--cchp-green-soft)]/40">
          <CardHeader>
            <CardTitle className="text-base">Decisions &amp; action items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">{note.summary}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-5">
          <RichText source={note.body} />
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {note.createdBy ? (
          <span className="inline-flex items-center gap-1.5">
            <UserAvatar user={note.createdBy} size="xs" /> {note.createdBy.firstName} {note.createdBy.lastName}
          </span>
        ) : null}
        <span>Last updated {fmtDateTime(note.updatedAt)}</span>
        {note.source ? <Badge variant="outline">Imported from: {note.source}</Badge> : null}
      </div>
    </div>
  );
}
