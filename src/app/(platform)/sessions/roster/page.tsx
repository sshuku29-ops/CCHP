import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireModule } from "@/lib/auth/guards";
import { fmtDate } from "@/lib/dates";
import {
  listAssignableUsers,
  listRosterForTerm,
  listRosterTerms,
  MIN_PRESENTERS,
  SESSION_ROLE_LABELS,
  type RosterSession,
  type SessionRole,
} from "@/lib/roster/queries";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { NativeSelect } from "@/components/shared/native-select";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RosterForm } from "./roster-form";

export const metadata = { title: "Session roster" };

/**
 * /sessions/roster?term=Fall 2026 — one card per session in the term with the
 * volunteers assigned to it and an "Assign" form. Admins with "records" only.
 */
export default async function RosterPage(props: PageProps<"/sessions/roster">) {
  await requireModule("records");
  const sp = await props.searchParams;
  const terms = await listRosterTerms();
  const requested = typeof sp.term === "string" ? sp.term : "";
  const term = terms.includes(requested) ? requested : terms[0];
  const [sessions, users] = await Promise.all([listRosterForTerm(term), listAssignableUsers(term)]);

  const upcoming = sessions.filter((s) => s.isUpcoming);
  const past = sessions.filter((s) => !s.isUpcoming);
  const short = upcoming.filter((s) => s.presenterCount < MIN_PRESENTERS).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Session roster"
        description={`Who is running each session in ${term}. Aim for at least ${MIN_PRESENTERS} presenters per session and spread the load.`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/export/sessions?term=${encodeURIComponent(term)}`}>Export CSV</a>
            </Button>
            <Button asChild size="sm">
              <Link href="/sessions/new">New session</Link>
            </Button>
          </>
        }
      />

      <form method="get" className="flex flex-wrap items-center gap-2">
        <NativeSelect name="term" defaultValue={term} aria-label="Term" className="w-48">
          {terms.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" size="sm" variant="secondary">
          Show term
        </Button>
        {short > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle className="size-4" /> {short} upcoming session{short === 1 ? "" : "s"} below {MIN_PRESENTERS} presenters
          </span>
        ) : null}
      </form>

      {sessions.length === 0 ? (
        <EmptyState
          title={`No sessions in ${term}`}
          description="Add the term's sessions first, then come back to assign volunteers."
          action={
            <Button asChild size="sm">
              <Link href="/sessions/new">New session</Link>
            </Button>
          }
        />
      ) : null}

      {upcoming.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">Upcoming</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((s) => (
              <SessionCard key={s.id} session={s} users={users} />
            ))}
          </div>
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">Past sessions</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {past.map((s) => (
              <SessionCard key={s.id} session={s} users={users} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SessionCard({ session: s, users }: { session: RosterSession; users: Awaited<ReturnType<typeof listAssignableUsers>> }) {
  const assigned: Record<string, string> = {};
  for (const v of s.volunteers) assigned[v.user.id] = v.role ?? "presenter";
  const lowOnPresenters = s.isUpcoming && s.presenterCount < MIN_PRESENTERS;
  return (
    <Card size="sm" className={lowOnPresenters ? "ring-amber-300 dark:ring-amber-700" : undefined}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Link href={`/sessions/${s.id}`} className="hover:underline">
            {fmtDate(s.date)}
          </Link>
          <StatusBadge status={s.type} />
        </CardTitle>
        <CardDescription>
          {s.title ?? s.topic ?? "Untitled session"}
          {s.location ? ` · ${s.location}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {s.volunteers.length} assigned · {s.presenterCount} presenter{s.presenterCount === 1 ? "" : "s"}
          </span>
          {lowOnPresenters ? (
            <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
              <AlertTriangle className="size-3.5" /> Needs {MIN_PRESENTERS - s.presenterCount} more
            </span>
          ) : null}
        </div>
        {s.volunteers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody assigned yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {s.volunteers.map((v) => (
              <li key={v.user.id} className="flex items-center gap-2 text-sm">
                <UserAvatar user={v.user} size="xs" />
                <span className="min-w-0 flex-1 truncate">
                  {v.user.firstName} {v.user.lastName}
                </span>
                <span className="text-xs text-muted-foreground">{SESSION_ROLE_LABELS[(v.role ?? "presenter") as SessionRole] ?? v.role}</span>
              </li>
            ))}
          </ul>
        )}
        <details className="rounded-lg border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Assign</summary>
          <div className="border-t p-3">
            <RosterForm sessionId={s.id} users={users} assigned={assigned} />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
