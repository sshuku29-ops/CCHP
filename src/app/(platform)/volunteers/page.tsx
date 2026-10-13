import Link from "next/link";
import { requireModule } from "@/lib/auth/guards";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { currentTermLabel, listSessionTerms, listVolunteers } from "@/lib/records/queries";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { NativeSelect } from "@/components/shared/native-select";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Volunteer directory" };

/**
 * Admin-only directory. Shows ONLY the allowed fields from spec §3.
 * Sorted by last name — this is a directory, not a ranking.
 */
export default async function VolunteersPage(props: PageProps<"/volunteers">) {
  await requireModule("volunteers");
  const sp = await props.searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const filters = {
    role: str(sp.role),
    active: (["active", "inactive", "all"].includes(str(sp.active)) ? str(sp.active) : "active") as "active" | "inactive" | "all",
    term: str(sp.term),
    q: str(sp.q),
  };
  const [rows, terms] = await Promise.all([listVolunteers(filters), listSessionTerms()]);
  const thisTerm = currentTermLabel();
  const exportQs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();

  return (
    <div>
      <PageHeader
        title="Volunteer directory"
        description="Everyone with an account, with their session participation and logged hours. Sorted by last name."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/volunteers/import">Import CSV</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/export/volunteers?${exportQs}`}>Export CSV</a>
            </Button>
          </>
        }
      />

      <form method="get" className="mb-4 grid gap-2 sm:grid-cols-2 md:grid-cols-5">
        <Input name="q" placeholder="Search by name" defaultValue={filters.q} />
        <NativeSelect name="role" defaultValue={filters.role}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="active" defaultValue={filters.active}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">Active + inactive</option>
        </NativeSelect>
        <NativeSelect name="term" defaultValue={filters.term}>
          <option value="">Any term</option>
          {terms.map((t) => (
            <option key={t} value={t}>
              Participated in {t}
            </option>
          ))}
        </NativeSelect>
        <div className="flex gap-2">
          <Button type="submit" size="sm">Filter</Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/volunteers">Clear</Link>
          </Button>
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="No one matches these filters" description="Try clearing the search or choosing a different term." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Graduation</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Hours ({thisTerm})</TableHead>
              <TableHead className="text-right">Hours (all time)</TableHead>
              <TableHead>Public opt-in</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <Link href={`/volunteers/${v.id}`} className="font-medium hover:underline">
                    {v.lastName}, {v.firstName}
                  </Link>
                  {!v.isActive ? <span className="ml-2 text-xs text-muted-foreground">(inactive)</span> : null}
                </TableCell>
                <TableCell className="text-muted-foreground">{v.email ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{v.phone ?? "—"}</TableCell>
                <TableCell>{fmtDate(v.graduationDate)}</TableCell>
                <TableCell>{v.hasVehicle ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <StatusBadge status={v.role} label={ROLE_LABELS[v.role as Role] ?? v.role} />
                </TableCell>
                <TableCell className="text-right">{v.sessionsCount}</TableCell>
                <TableCell className="text-right">{v.hoursThisTerm}</TableCell>
                <TableCell className="text-right">{v.hoursAllTime}</TableCell>
                <TableCell>{v.publicHoursOptIn ? "Yes" : "No"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{rows.length} people shown.</p>
    </div>
  );
}
