import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth/guards";
import { HOURS_TYPE_LABELS, HOURS_TYPES } from "@/lib/constants";
import { academicYearLabel, fmtDateTime } from "@/lib/dates";
import { deleteReportAction } from "@/lib/reports/actions";
import { computeYearMetrics } from "@/lib/reports/metrics";
import { getReport } from "@/lib/reports/queries";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportForm } from "@/components/records/report-form";
import { ReportPublishButtons } from "@/components/records/report-publish-buttons";

export const metadata = { title: "Annual report" };

export default async function ReportEditPage(props: PageProps<"/reports-admin/[year]">) {
  await requireModule("reports");
  const { year: yearStr } = await props.params;
  if (!/^\d{4}$/.test(yearStr)) notFound();
  const year = Number(yearStr);
  const [report, metrics] = await Promise.all([getReport(year), computeYearMetrics(year)]);
  if (!report) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={report.title}
        description={`Academic year ${academicYearLabel(year)} (${metrics.from} to ${metrics.to})`}
        actions={
          <>
            <StatusBadge status={report.status} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/reports-admin/${year}/print`}>Printable view</Link>
            </Button>
            {report.status === "PUBLISHED" ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/reports/${year}`}>Public page</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <a href={`/api/export/reports?year=${year}`}>Export CSV</a>
            </Button>
            <ReportPublishButtons year={year} status={report.status} />
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Metrics (live)</CardTitle>
          <CardDescription>
            Computed right now from session records, hours logs, applications and training.
            {report.status === "PUBLISHED" && report.publishedAt
              ? ` The public page shows the snapshot taken when published (${fmtDateTime(report.publishedAt)}); republish to refresh it.`
              : " Publishing freezes a copy of these numbers for the public page."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Formal sessions" value={metrics.formalSessions} />
            <StatCard label="Informal sessions" value={metrics.informalSessions} />
            <StatCard label="Participants" value={metrics.totalParticipants} hint="Sum of attendance counts" />
            <StatCard label="Volunteer hours" value={metrics.totalVolunteerHours} />
            <StatCard label="Active volunteers" value={metrics.activeVolunteers} hint="Logged hours or ran a session" />
            <StatCard label="Applications" value={metrics.applicationsReceived} hint={`${metrics.applicationsAccepted} accepted`} />
            <StatCard label="Training modules completed" value={metrics.modulesCompleted} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <p className="font-medium mb-1">Hours by type</p>
              <ul className="space-y-0.5">
                {HOURS_TYPES.map((t) => (
                  <li key={t} className="flex justify-between border-b py-1">
                    <span>{HOURS_TYPE_LABELS[t]}</span>
                    <span>{metrics.hoursByType[t]}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">Formal session topics</p>
              {metrics.formalTopics.length === 0 ? (
                <p className="text-muted-foreground">None recorded for this year.</p>
              ) : (
                <ul className="list-disc pl-5 space-y-0.5">
                  {metrics.formalTopics.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Narrative</CardTitle>
          <CardDescription>Saved as a draft until you press Publish. Everything here appears on the public page.</CardDescription>
        </CardHeader>
        <CardContent>
          <ReportForm report={report} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ConfirmButton
          variant="destructive"
          size="sm"
          message="Delete this report and its narrative? This cannot be undone."
          action={deleteReportAction.bind(null, year)}
        >
          Delete report
        </ConfirmButton>
      </div>
    </div>
  );
}
