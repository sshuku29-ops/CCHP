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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionForm } from "@/components/records/session-form";

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
            <ul className="list-disc pl-5">
              {session.materials.map((m) => (
                <li key={m.id}>
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    {m.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
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
