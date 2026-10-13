import Link from "next/link";
import { requireUser, isAdmin } from "@/lib/auth/guards";
import {
  listMyHours,
  summarizeHours,
  listRecentSessions,
  listAllHours,
  collectiveTotals,
  hoursFilterOptions,
  hoursFiltersFromSearchParams,
  listUsersForHours,
  type AllHoursRow,
} from "@/lib/hours/queries";
import { deleteHoursLog } from "@/lib/hours/actions";
import { HOURS_TYPES, HOURS_TYPE_LABELS } from "@/lib/constants";
import { academicYearLabel, fmtDate } from "@/lib/dates";
import { fullName } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HoursLogForm } from "@/components/lms/hours-form";
import { MyCertificates } from "@/components/certificates/my-certificates";
import { listMySessionIds } from "@/lib/roster/queries";

export const metadata = { title: "Hours" };

function typeLabel(t: string) {
  return HOURS_TYPE_LABELS[t as keyof typeof HOURS_TYPE_LABELS] ?? t;
}
function sessionLabel(s: AllHoursRow["sessionRecord"]) {
  if (!s) return "—";
  return `${fmtDate(s.date)} · ${s.title ?? s.topic ?? (s.type === "FORMAL" ? "Formal" : "Informal")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return fmtDate(new Date(Date.UTC(y, m - 1, 1)), "MMM yyyy");
}

/**
 * /hours — log hours + personal totals. Admins get an "All volunteers" tab (?tab=all)
 * with filters, collective totals and a CSV export. No per-person ranking anywhere.
 */
export default async function HoursPage(props: PageProps<"/hours">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const admin = isAdmin(user);
  const tab = admin && sp.tab === "all" ? "all" : "mine";

  const [recentSessions, users, mySessionIds] = await Promise.all([
    listRecentSessions(),
    admin ? listUsersForHours() : Promise.resolve(undefined),
    listMySessionIds(user.id),
  ]);
  // Sessions this person is rostered for come first in the picker (same order otherwise).
  const sessions = [...recentSessions].sort((a, b) => Number(mySessionIds.has(b.id)) - Number(mySessionIds.has(a.id)));

  return (
    <div>
      <PageHeader
        title="Volunteer hours"
        description={admin ? "Log hours and see the team's collective totals." : "Log your hours after each session or prep block. They feed your running total."}
        actions={
          admin ? (
            <div className="flex gap-1 rounded-lg bg-muted p-[3px]">
              <Button asChild size="sm" variant={tab === "mine" ? "default" : "ghost"}>
                <Link href="/hours">My hours</Link>
              </Button>
              <Button asChild size="sm" variant={tab === "all" ? "default" : "ghost"}>
                <Link href="/hours?tab=all">All volunteers</Link>
              </Button>
            </div>
          ) : null
        }
      />
      {tab === "mine" ? <MyHours userId={user.id} sessions={sessions} users={users} /> : <AllHours sp={sp} sessions={sessions} users={users!} userId={user.id} />}
    </div>
  );
}

// ───────────────────────── My hours ────────────────────────────

async function MyHours({
  userId,
  sessions,
  users,
}: {
  userId: string;
  sessions: Awaited<ReturnType<typeof listRecentSessions>>;
  users?: Awaited<ReturnType<typeof listUsersForHours>>;
}) {
  const logs = await listMyHours(userId);
  const totals = summarizeHours(logs);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-6 lg:order-2">
        <Card>
          <CardHeader>
            <CardTitle>Log hours</CardTitle>
          </CardHeader>
          <CardContent>
            <HoursLogForm sessions={sessions} users={users} currentUserId={userId} />
          </CardContent>
        </Card>
        <MyCertificates userId={userId} />
      </div>

      <div className="space-y-6 lg:order-1">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label={totals.thisTerm} value={totals.term} hint="hours this term" />
          <StatCard label={academicYearLabel(totals.thisYear)} value={totals.year} hint="hours this academic year" />
          <StatCard label="All time" value={totals.allTime} hint="hours total" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>By type (all time)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {totals.byType.map((t) => (
                <li key={t.type} className="flex justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>{t.label}</span>
                  <span className="font-medium">{t.hours}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My log</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <EmptyState title="No hours logged yet" description="Use the form to add your first entry." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{fmtDate(l.date)}</TableCell>
                      <TableCell className="font-medium">{l.hours}</TableCell>
                      <TableCell>{typeLabel(l.type)}</TableCell>
                      <TableCell className="whitespace-normal">{sessionLabel(l.sessionRecord)}</TableCell>
                      <TableCell className="whitespace-normal max-w-xs text-muted-foreground">{l.notes ?? ""}</TableCell>
                      <TableCell className="text-right">
                        <ConfirmButton action={deleteHoursLog.bind(null, l.id)} message="Delete this entry?" size="xs" variant="ghost" className="text-destructive">
                          Delete
                        </ConfirmButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ───────────────────────── Admin: all volunteers ───────────────

async function AllHours({
  sp,
  sessions,
  users,
  userId,
}: {
  sp: Record<string, string | string[] | undefined>;
  sessions: Awaited<ReturnType<typeof listRecentSessions>>;
  users: Awaited<ReturnType<typeof listUsersForHours>>;
  userId: string;
}) {
  const filters = hoursFiltersFromSearchParams(sp);
  const [rows, options] = await Promise.all([listAllHours(filters), hoursFilterOptions()]);
  const totals = collectiveTotals(rows);
  const qs = new URLSearchParams();
  if (filters.term) qs.set("term", filters.term);
  if (filters.year !== undefined) qs.set("year", String(filters.year));
  if (filters.type) qs.set("type", filters.type);
  if (filters.userId) qs.set("user", filters.userId);
  const exportHref = `/api/export/hours${qs.size ? `?${qs}` : ""}`;

  return (
    <div className="space-y-6">
      {/* Filters: a plain GET form, no client JS needed. */}
      <Card>
        <CardContent className="pt-5">
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <input type="hidden" name="tab" value="all" />
            <div className="space-y-1">
              <label htmlFor="f-term" className="text-xs font-medium">Term</label>
              <NativeSelect id="f-term" name="term" defaultValue={filters.term ?? ""}>
                <option value="">All terms</option>
                {options.terms.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <label htmlFor="f-year" className="text-xs font-medium">Academic year</label>
              <NativeSelect id="f-year" name="year" defaultValue={filters.year?.toString() ?? ""}>
                <option value="">All years</option>
                {options.years.map((y) => (
                  <option key={y} value={y}>{academicYearLabel(y)}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <label htmlFor="f-type" className="text-xs font-medium">Type</label>
              <NativeSelect id="f-type" name="type" defaultValue={filters.type ?? ""}>
                <option value="">All types</option>
                {HOURS_TYPES.map((t) => (
                  <option key={t} value={t}>{HOURS_TYPE_LABELS[t]}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <label htmlFor="f-user" className="text-xs font-medium">Volunteer</label>
              <NativeSelect id="f-user" name="user" defaultValue={filters.userId ?? ""}>
                <option value="">Everyone</option>
                {options.users.map((u) => (
                  <option key={u.id} value={u.id}>{fullName(u)}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">Apply</Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/hours?tab=all">Reset</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={exportHref}>Export CSV</a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total hours" value={totals.total} hint="for the current filter" />
        <StatCard label="Entries" value={totals.entries} />
        <StatCard label="Volunteers" value={new Set(rows.map((r) => r.userId)).size} hint="who logged hours" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Collective hours by type</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {totals.byType.map((t) => (
                <li key={t.type} className="flex justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>{t.label}</span>
                  <span className="font-medium">{t.hours}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Collective hours by month</CardTitle>
          </CardHeader>
          <CardContent>
            {totals.byMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entries.</p>
            ) : (
              <ul className="space-y-2">
                {totals.byMonth.map((m) => (
                  <li key={m.key} className="flex justify-between rounded-lg border px-3 py-2 text-sm">
                    <span>{monthLabel(m.key)}</span>
                    <span className="font-medium">{m.hours}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState title="No hours match these filters" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Volunteer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{fullName(r.user)}</TableCell>
                    <TableCell>{fmtDate(r.date)}</TableCell>
                    <TableCell>{r.hours}</TableCell>
                    <TableCell>{typeLabel(r.type)}</TableCell>
                    <TableCell className="whitespace-normal">{sessionLabel(r.sessionRecord)}</TableCell>
                    <TableCell className="whitespace-normal max-w-xs text-muted-foreground">{r.notes ?? ""}</TableCell>
                    <TableCell className="text-right">
                      <ConfirmButton action={deleteHoursLog.bind(null, r.id)} message={`Delete this entry for ${fullName(r.user)}?`} size="xs" variant="ghost" className="text-destructive">
                        Delete
                      </ConfirmButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Log hours for a volunteer</CardTitle>
        </CardHeader>
        <CardContent>
          <HoursLogForm sessions={sessions} users={users} currentUserId={userId} />
        </CardContent>
      </Card>
    </div>
  );
}
