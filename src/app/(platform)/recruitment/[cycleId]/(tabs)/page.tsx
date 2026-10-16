import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule, isMainAdmin } from "@/lib/auth/guards";
import { rankApplications } from "@/lib/recruitment/queries";
import { deleteApplicationAction } from "@/lib/recruitment/actions";
import { fmtDateTime } from "@/lib/dates";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { StatusSelect, FlagCheckbox } from "@/components/recruitment/row-controls";
import { CopyEmailsButton } from "@/components/recruitment/copy-emails-button";

export const metadata = { title: "Applications" };

const MY_STATUS: Record<string, { label: string; className: string }> = {
  done: { label: "Done", className: "border-transparent bg-emerald-100 text-emerald-900" },
  partial: { label: "Partial", className: "border-transparent bg-amber-100 text-amber-900" },
  not_started: { label: "Not started", className: "" },
};

/**
 * Ranked list of applications for a cycle. Names/emails are hidden unless
 * ?reveal=1 is set (for the decision meeting). Scoring itself happens on the
 * anonymized review page.
 */
export default async function ApplicationsTab(props: PageProps<"/recruitment/[cycleId]">) {
  const user = await requireModule("recruitment");
  const { cycleId } = await props.params;
  const sp = await props.searchParams;
  const reveal = sp.reveal === "1";

  const data = await rankApplications(cycleId, user.id);
  if (!data) notFound();
  const { applications, maxTotal, cycle } = data;

  const acceptedEmails = applications.filter((a) => a.status === "ACCEPTED").map((a) => a.email);
  const interviewEmails = applications.filter((a) => a.status === "INTERVIEW" || a.flaggedForInterview).map((a) => a.email);
  const mainAdmin = isMainAdmin(user);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {applications.length} application{applications.length === 1 ? "" : "s"} · ranked by average score out of {maxTotal}
          {cycle.criteria.length === 0 ? " · add rubric criteria before scoring" : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant={reveal ? "default" : "outline"}>
            <Link href={reveal ? `/recruitment/${cycleId}` : `/recruitment/${cycleId}?reveal=1`}>{reveal ? "Hide names" : "Reveal names"}</Link>
          </Button>
          <CopyEmailsButton emails={acceptedEmails} label="Copy emails of accepted" />
          <CopyEmailsButton emails={interviewEmails} label="Copy emails of interviewees" />
          <Button asChild size="sm" variant="outline">
            <a href={`/api/export/recruitment?cycleId=${encodeURIComponent(cycleId)}`}>Export CSV</a>
          </Button>
        </div>
      </div>

      {reveal ? (
        <Alert>
          <AlertTitle>Names revealed</AlertTitle>
          <AlertDescription>
            Use this view for the decision meeting only. The review page stays anonymous. Scores already given are not affected.
          </AlertDescription>
        </Alert>
      ) : null}

      {applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description={`Share the public link /apply/${cycle.slug} once the cycle is open.`}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Code</TableHead>
                {reveal ? <TableHead>Name</TableHead> : null}
                {reveal ? <TableHead>Email</TableHead> : null}
                <TableHead>Affiliation</TableHead>
                <TableHead className="text-right">Avg</TableHead>
                <TableHead className="text-right">Reviewers</TableHead>
                <TableHead>My score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Interview?</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((a, i) => (
                <TableRow key={a.id} className={a.flaggedForInterview ? "bg-violet-50/50 dark:bg-violet-900/10" : undefined}>
                  <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{a.code}</span>
                    <div className="text-xs text-muted-foreground">{fmtDateTime(a.submittedAt)}</div>
                  </TableCell>
                  {reveal ? (
                    <TableCell className="whitespace-nowrap">
                      {a.firstName} {a.lastName}
                    </TableCell>
                  ) : null}
                  {reveal ? (
                    <TableCell>
                      <a href={`mailto:${a.email}`} className="underline underline-offset-2">
                        {a.email}
                      </a>
                      {a.phone ? <div className="text-xs text-muted-foreground">{a.phone}</div> : null}
                    </TableCell>
                  ) : null}
                  <TableCell className="text-sm">{a.affiliation ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {a.average === null ? <span className="text-muted-foreground">—</span> : <span className="font-medium">{a.average.toFixed(1)}</span>}
                    <span className="text-xs text-muted-foreground"> / {maxTotal}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {a.reviewersComplete}
                    {a.reviewersScored > a.reviewersComplete ? (
                      <span className="text-xs text-muted-foreground"> (+{a.reviewersScored - a.reviewersComplete} partial)</span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={MY_STATUS[a.myStatus].className}>
                      {MY_STATUS[a.myStatus].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <StatusSelect key={a.status} applicationId={a.id} status={a.status} />
                      <StatusBadge status={a.status} className="w-fit" />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <FlagCheckbox key={String(a.flaggedForInterview)} applicationId={a.id} flagged={a.flaggedForInterview} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild size="sm" variant={a.myStatus === "done" ? "ghost" : "default"}>
                        <Link href={`/recruitment/${cycleId}/review/${a.id}`}>{a.myStatus === "done" ? "Re-review" : "Review"}</Link>
                      </Button>
                      {mainAdmin ? (
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          message={`Delete application ${a.code}? Its answers, scores and notes are removed permanently.`}
                          action={deleteApplicationAction.bind(null, a.id)}
                        >
                          Delete
                        </ConfirmButton>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
