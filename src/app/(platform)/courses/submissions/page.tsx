import Link from "next/link";
import { requireModule } from "@/lib/auth/guards";
import { listSubmissionsForReview, assignmentHref } from "@/lib/lms/queries";
import { SUBMISSION_STATUSES } from "@/lib/constants";
import { fmtDateTime } from "@/lib/dates";
import { fullName } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Review queue" };

/** /courses/submissions — admin review queue. ?status=SUBMITTED (default) | REVIEWED | NEEDS_REVISION | ALL */
export default async function SubmissionsQueuePage(props: PageProps<"/courses/submissions">) {
  await requireModule("lms");
  const sp = await props.searchParams;
  const raw = typeof sp.status === "string" ? sp.status : "SUBMITTED";
  const status = raw === "ALL" ? undefined : (SUBMISSION_STATUSES as readonly string[]).includes(raw) ? raw : "SUBMITTED";
  const rows = await listSubmissionsForReview(status);
  const filters = [...SUBMISSION_STATUSES, "ALL"] as const;
  const labels: Record<string, string> = { SUBMITTED: "Awaiting review", REVIEWED: "Reviewed", NEEDS_REVISION: "Needs revision", ALL: "All" };

  return (
    <div>
      <p className="text-sm mb-2">
        <Link href="/courses" className="text-muted-foreground hover:underline underline-offset-4">
          ← Training
        </Link>
      </p>
      <PageHeader
        title="Review queue"
        description="Assignment submissions from volunteers. Open one to leave feedback."
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={`/api/export/submissions${status ? `?status=${status}` : ""}`}>Export CSV</a>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => {
          const active = (status ?? "ALL") === f;
          return (
            <Button key={f} asChild size="sm" variant={active ? "default" : "outline"}>
              <Link href={`/courses/submissions?status=${f}`}>{labels[f]}</Link>
            </Button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Nothing here" description="No submissions match this filter." />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Volunteer</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => {
                const href = assignmentHref(s.assignment.module.course.id, s.assignment.module.id, s.assignment.id);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{fullName(s.user)}</TableCell>
                    <TableCell className="whitespace-normal">
                      <p>{s.assignment.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.assignment.module.course.title} · {s.assignment.module.title}
                      </p>
                    </TableCell>
                    <TableCell>{fmtDateTime(s.submittedAt)}</TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={href}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
