import Link from "next/link";
import { requireModule } from "@/lib/auth/guards";
import { academicYearForDate, academicYearLabel, fmtDate } from "@/lib/dates";
import { listReports } from "@/lib/reports/queries";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewReportForm } from "@/components/records/new-report-form";

export const metadata = { title: "Annual reports" };

export default async function ReportsAdminPage() {
  await requireModule("reports");
  const reports = await listReports();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Annual reports"
        description="One report per academic year (August to July). Metrics are computed from session records and hours; you write the narrative."
      />

      <Card>
        <CardHeader>
          <CardTitle>Start a report</CardTitle>
        </CardHeader>
        <CardContent>
          <NewReportForm defaultYear={academicYearForDate(new Date())} />
        </CardContent>
      </Card>

      {reports.length === 0 ? (
        <EmptyState title="No reports yet" description="Create one above for the current academic year." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Academic year</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/reports-admin/${r.year}`} className="font-medium hover:underline">
                    {academicYearLabel(r.year)}
                  </Link>
                </TableCell>
                <TableCell>{r.title}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell>{fmtDate(r.publishedAt)}</TableCell>
                <TableCell>{fmtDate(r.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/reports-admin/${r.year}`}>Open</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
