import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth/guards";
import { fmtDate } from "@/lib/dates";
import { deleteSessionAction } from "@/lib/records/actions";
import { getSession, listUsersForPicker } from "@/lib/records/queries";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionForm } from "@/components/records/session-form";
import { SessionDocumentUpload } from "@/components/records/session-document-upload";
import { SessionDocumentDelete } from "@/components/records/session-document-delete";
import { DocumentViewer } from "@/components/shared/document-viewer";
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS } from "@/lib/documents";

export const metadata = { title: "Session" };

export default async function SessionDetailPage(props: PageProps<"/sessions/[id]">) {
  await requireModule("records");
  const { id } = await props.params;
  const [session, users] = await Promise.all([getSession(id), listUsersForPicker()]);
  if (!session) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={session.title ?? session.topic ?? "Session"}
        description={`${fmtDate(session.date)} · ${session.term}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/sessions">All sessions</Link>
            </Button>
            <ConfirmButton
              variant="destructive"
              size="sm"
              message="Delete this session record? Volunteer hours stay, but their link to this session is removed."
              action={deleteSessionAction.bind(null, session.id)}
            >
              Delete
            </ConfirmButton>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusBadge status={session.type} />
            <span>{session.participantCount} participants</span>
            <span className="text-muted-foreground font-normal">· {session.volunteers.length} volunteers</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {session.location ? <p><span className="text-muted-foreground">Location:</span> {session.location}</p> : null}
          {session.volunteers.length ? (
            <p>
              <span className="text-muted-foreground">Volunteers:</span>{" "}
              {session.volunteers.map((v) => `${v.user.firstName} ${v.user.lastName}`).join(", ")}
            </p>
          ) : null}
          {session.materials.length ? (
            <div>
              <p className="text-muted-foreground">External links:</p>
              <ul className="list-disc pl-5">
                {session.materials.map((m) => (
                  <li key={m.id}>
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                      {m.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Uploaded files: brochures, slides, volunteer photos. Grouped by category, viewable inline. */}
      <Card>
        <CardHeader>
          <CardTitle>Materials</CardTitle>
          <CardDescription>Files stored on the platform for this session. Public files also appear on the website.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {session.documents.length === 0 ? <p className="text-sm text-muted-foreground">No files uploaded yet.</p> : null}
          {groupByCategory(session.documents).map((group, gi) => (
            <section key={group.category} aria-label={group.label} className="space-y-3">
              <h3 className="text-sm font-semibold">{group.label}</h3>
              {group.docs.map((doc, di) => (
                <div key={doc.id} className="space-y-1">
                  <DocumentViewer doc={doc} defaultOpen={gi === 0 && di === 0} />
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-2">
                      {doc.isPublic ? <Badge variant="secondary">Public</Badge> : <Badge variant="outline">Team only</Badge>}
                      {doc.fileName} · {formatSize(doc.size)} · added {fmtDate(doc.createdAt)}
                    </span>
                    <SessionDocumentDelete sessionId={session.id} documentId={doc.id} title={doc.title} />
                  </div>
                </div>
              ))}
            </section>
          ))}
          <div className="border-t pt-5">
            <h3 className="mb-3 text-sm font-semibold">Upload a file</h3>
            <SessionDocumentUpload
              sessionId={session.id}
              categories={DOCUMENT_CATEGORIES.map((c) => ({ value: c, label: DOCUMENT_CATEGORY_LABELS[c] }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionForm
            users={users}
            session={{
              id: session.id,
              date: session.date,
              type: session.type,
              topic: session.topic,
              title: session.title,
              participantCount: session.participantCount,
              location: session.location,
              notes: session.notes,
              materials: session.materials.map((m) => ({ label: m.label, url: m.url })),
              volunteerIds: session.volunteers.map((v) => v.userId),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

type SessionDoc = NonNullable<Awaited<ReturnType<typeof getSession>>>["documents"][number];

/** Group documents by category in DOCUMENT_CATEGORIES order so the page reads top-down. */
function groupByCategory(docs: SessionDoc[]) {
  return DOCUMENT_CATEGORIES.map((category) => ({
    category,
    label: DOCUMENT_CATEGORY_LABELS[category],
    docs: docs.filter((d) => d.category === category),
  })).filter((g) => g.docs.length > 0);
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
