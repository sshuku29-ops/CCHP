import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth/guards";
import { HOURS_TYPE_LABELS, ROLE_LABELS, type Role } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { getVolunteer } from "@/lib/records/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VolunteerEditForm } from "@/components/records/volunteer-edit-form";

export const metadata = { title: "Volunteer" };

export default async function VolunteerDetailPage(props: PageProps<"/volunteers/[id]">) {
  await requireModule("volunteers");
  const { id } = await props.params;
  const v = await getVolunteer(id);
  if (!v) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <UserAvatar user={v} size="lg" className="mt-1 shrink-0" />
        <div className="min-w-0 flex-1">
          <PageHeader
            title={`${v.firstName} ${v.lastName}`}
            description={`${ROLE_LABELS[v.role as Role] ?? v.role}${v.isActive ? "" : " · inactive"}${v.publicHoursOptIn ? " · opted in to public volunteer list" : ""}`}
            actions={
              <Button asChild variant="outline" size="sm">
                <Link href="/volunteers">Back to directory</Link>
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Sessions participated" value={v.sessionParticipation.length} />
        <StatCard label={`Hours · ${v.thisTerm}`} value={v.hoursThisTerm} />
        <StatCard label="Hours · all time" value={v.hoursAllTime} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directory details</CardTitle>
        </CardHeader>
        <CardContent>
          <VolunteerEditForm volunteer={v} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {v.sessionParticipation.length === 0 ? (
            <EmptyState title="No sessions recorded yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {v.sessionParticipation.map((p) => (
                  <TableRow key={p.session.id}>
                    <TableCell>
                      <Link href={`/sessions/${p.session.id}`} className="hover:underline">
                        {fmtDate(p.session.date)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.session.type} />
                    </TableCell>
                    <TableCell>{p.session.topic ?? p.session.title ?? "—"}</TableCell>
                    <TableCell>{p.session.term}</TableCell>
                    <TableCell className="text-muted-foreground">{p.role ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hours log</CardTitle>
        </CardHeader>
        <CardContent>
          {v.hoursLogs.length === 0 ? (
            <EmptyState title="No hours logged yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {v.hoursLogs.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{fmtDate(h.date)}</TableCell>
                    <TableCell className="text-right">{h.hours}</TableCell>
                    <TableCell>{HOURS_TYPE_LABELS[h.type as keyof typeof HOURS_TYPE_LABELS] ?? h.type}</TableCell>
                    <TableCell className="text-muted-foreground">{h.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
