import Link from "next/link";
import { requireModule } from "@/lib/auth/guards";
import { listCycles } from "@/lib/recruitment/queries";
import { toggleCycleOpenAction } from "@/lib/recruitment/actions";
import { cycleWindowLabel, isCycleOpenNow } from "@/lib/recruitment/helpers";
import { CYCLE_TYPE_LABELS } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/recruitment/action-button";
import { NewCycleForm } from "@/components/recruitment/new-cycle-form";

export const metadata = { title: "Recruitment" };

export default async function RecruitmentPage() {
  await requireModule("recruitment");
  const cycles = await listCycles();

  return (
    <div>
      <PageHeader
        title="Recruitment"
        description="Application cycles for volunteers, leadership, and partners. Reviewers score anonymously; decisions happen on the ranked list."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,380px)]">
        <Card>
          <CardHeader>
            <CardTitle>Cycles</CardTitle>
            <CardDescription>Open a cycle to accept applications at its public link. Closed cycles stay reviewable.</CardDescription>
          </CardHeader>
          <CardContent>
            {cycles.length === 0 ? (
              <EmptyState title="No cycles yet" description="Create your first cycle with the form on the right." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cycle</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead className="text-right">Applications</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cycles.map((c) => {
                      const acceptingNow = isCycleOpenNow(c);
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Link href={`/recruitment/${c.id}`} className="font-medium hover:underline">
                              {c.name}
                            </Link>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              Public link:{" "}
                              <Link href={`/apply/${encodeURIComponent(c.slug)}`} target="_blank" className="underline underline-offset-2">
                                /apply/{c.slug}
                              </Link>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{CYCLE_TYPE_LABELS[c.type as keyof typeof CYCLE_TYPE_LABELS] ?? c.type}</TableCell>
                          <TableCell>
                            {c.isOpen ? (
                              <Badge className={acceptingNow ? "bg-emerald-100 text-emerald-900 border-transparent" : "bg-amber-100 text-amber-900 border-transparent"}>
                                {acceptingNow ? "Open" : "Open (outside dates)"}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Closed</Badge>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{cycleWindowLabel(c, (d) => fmtDate(d))}</TableCell>
                          <TableCell className="text-right tabular-nums">{c._count.applications}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <ActionButton size="sm" variant={c.isOpen ? "outline" : "default"} action={toggleCycleOpenAction.bind(null, c.id)}>
                                {c.isOpen ? "Close" : "Open"}
                              </ActionButton>
                              <Button asChild size="sm" variant="ghost">
                                <Link href={`/recruitment/${c.id}`}>Review</Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>New cycle</CardTitle>
            <CardDescription>One cycle per application round (e.g. &ldquo;Volunteer applications — Spring 2026&rdquo;).</CardDescription>
          </CardHeader>
          <CardContent>
            <NewCycleForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
