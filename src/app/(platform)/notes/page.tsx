import Link from "next/link";
import { requireModule } from "@/lib/auth/guards";
import { listMeetingNotes, listNoteYears } from "@/lib/notes/queries";
import { fmtDate } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Meeting notes" };

/**
 * /notes — every meeting note, newest first. Search + year filter are plain
 * GET params so the page stays a server component.
 */
export default async function NotesPage(props: PageProps<"/notes">) {
  await requireModule("projects");
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const yearParam = typeof sp.year === "string" ? Number(sp.year) : NaN;
  const year = Number.isInteger(yearParam) && yearParam > 2000 ? yearParam : null;

  const [notes, years] = await Promise.all([listMeetingNotes({ q, year }), listNoteYears()]);

  const yearHref = (y: number | null) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (y) params.set("year", String(y));
    const qs = params.toString();
    return `/notes${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Meeting notes"
        description="Notes from board meetings, advisor check-ins and partner meetings. Searchable, so nothing gets lost in a Google Doc again."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <a href="/api/export/notes">Export CSV</a>
            </Button>
            <Button size="sm" asChild>
              <Link href="/notes/new">New note</Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form action="/notes" method="get" className="flex w-full max-w-md gap-2">
          {year ? <input type="hidden" name="year" value={year} /> : null}
          <Input name="q" defaultValue={q} placeholder="Search titles and notes…" aria-label="Search notes" />
          <Button type="submit" variant="outline">Search</Button>
          {q ? (
            <Button variant="ghost" asChild>
              <Link href={year ? `/notes?year=${year}` : "/notes"}>Clear</Link>
            </Button>
          ) : null}
        </form>
        {years.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-muted-foreground mr-1">Year:</span>
            <Button size="sm" variant={year === null ? "default" : "outline"} asChild>
              <Link href={yearHref(null)}>All</Link>
            </Button>
            {years.map((y) => (
              <Button key={y} size="sm" variant={year === y ? "default" : "outline"} asChild>
                <Link href={yearHref(y)}>{y}</Link>
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {notes.length === 0 ? (
        <EmptyState
          title={q || year ? "No notes match." : "No meeting notes yet."}
          description={q || year ? "Try a different search or year." : "Write up your next meeting here so the whole board can find it later."}
          action={
            <Button asChild>
              <Link href="/notes/new">New note</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id}>
              <Card className="transition-colors hover:bg-muted/40">
                <CardContent className="pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/notes/${n.id}`} className="font-medium hover:underline underline-offset-4">
                        {n.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fmtDate(n.date)}
                        {n.attendees ? ` · ${n.attendees}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {n.source ? <Badge variant="outline" className="text-[11px]">Imported</Badge> : null}
                      {n.createdBy ? <UserAvatar user={n.createdBy} size="xs" /> : null}
                    </div>
                  </div>
                  {n.summary ? <p className="mt-2 text-sm text-muted-foreground line-clamp-3 whitespace-pre-line">{n.summary}</p> : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Coming later: record a meeting and have it transcribed into a note automatically. For now, type or paste your notes.
      </p>
    </div>
  );
}
