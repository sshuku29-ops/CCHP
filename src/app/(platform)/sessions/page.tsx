import Link from "next/link";
import { requireModule } from "@/lib/auth/guards";
import { SESSION_TYPES } from "@/lib/constants";
import { academicYearLabel, fmtDate } from "@/lib/dates";
import { listSessionTerms, listSessionYears, listSessions } from "@/lib/records/queries";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { NativeSelect } from "@/components/shared/native-select";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Session records" };

type Row = Awaited<ReturnType<typeof listSessions>>[number];

function SessionTable({ rows, totals }: { rows: Row[]; totals?: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Topic</TableHead>
          <TableHead>Term</TableHead>
          <TableHead className="text-right">Participants</TableHead>
          <TableHead className="text-right">Volunteers</TableHead>
          <TableHead className="text-right">Files / links</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => (
          <TableRow key={s.id}>
            <TableCell>
              <Link href={`/sessions/${s.id}`} className="font-medium hover:underline">
                {fmtDate(s.date)}
              </Link>
            </TableCell>
            <TableCell>
              <StatusBadge status={s.type} />
            </TableCell>
            <TableCell>{s.title ?? s.topic ?? "—"}</TableCell>
            <TableCell>{s.term}</TableCell>
            <TableCell className="text-right">{s.participantCount}</TableCell>
            <TableCell className="text-right">{s._count.volunteers}</TableCell>
            <TableCell className="text-right tabular-nums">
              {s._count.documents} / {s._count.materials}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      {totals ? (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>
              Total: {rows.length} session{rows.length === 1 ? "" : "s"}
            </TableCell>
            <TableCell className="text-right">{rows.reduce((n, s) => n + s.participantCount, 0)}</TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        </TableFooter>
      ) : null}
    </Table>
  );
}

export default async function SessionsPage(props: PageProps<"/sessions">) {
  await requireModule("records");
  const sp = await props.searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const year = /^\d{4}$/.test(str(sp.year)) ? Number(sp.year) : undefined;
  const term = str(sp.term);
  const type = (SESSION_TYPES as readonly string[]).includes(str(sp.type)) ? str(sp.type) : "";
  const [rows, years, terms] = await Promise.all([listSessions({ year, term, type }), listSessionYears(), listSessionTerms()]);

  // Split into upcoming (today or later) and past. Dates are UTC midnight.
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const upcoming = rows.filter((s) => s.date.getTime() >= todayUtc).reverse(); // soonest first
  const past = rows.filter((s) => s.date.getTime() < todayUtc);
  const exportQs = new URLSearchParams(
    Object.entries({ year: year ? String(year) : "", term, type }).filter(([, v]) => v),
  ).toString();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Session records"
        description="Every formal and informal session: date, topic, how many residents attended, which volunteers ran it."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/export/sessions?${exportQs}`}>Export CSV</a>
            </Button>
            <Button asChild size="sm">
              <Link href="/sessions/new">New session</Link>
            </Button>
          </>
        }
      />

      <form method="get" className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        <NativeSelect name="year" defaultValue={year ? String(year) : ""}>
          <option value="">All academic years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {academicYearLabel(y)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="term" defaultValue={term}>
          <option value="">All terms</option>
          {terms.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="type" defaultValue={type}>
          <option value="">Formal + informal</option>
          <option value="FORMAL">Formal only</option>
          <option value="INFORMAL">Informal only</option>
        </NativeSelect>
        <div className="flex gap-2">
          <Button type="submit" size="sm">Filter</Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/sessions">Clear</Link>
          </Button>
        </div>
      </form>

      {upcoming.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">Upcoming</h2>
          <SessionTable rows={upcoming} />
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-heading text-lg font-semibold">Past sessions</h2>
        {past.length === 0 ? (
          <EmptyState
            title="No sessions recorded"
            description="Add one with “New session”, or import the old record keeping sheet from the volunteer directory."
            action={
              <Button asChild size="sm">
                <Link href="/sessions/new">New session</Link>
              </Button>
            }
          />
        ) : (
          <SessionTable rows={past} totals />
        )}
      </section>
    </div>
  );
}
