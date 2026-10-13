import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { requireModule } from "@/lib/auth/guards";
import { getGoal } from "@/lib/projects/queries";
import { setGoalStatus } from "@/lib/projects/actions";
import { goalTermOptions } from "@/lib/projects/terms";
import { fmtDate } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GoalForm } from "@/components/projects/goal-form";
import { ProgressBar, ProjectDot } from "@/components/projects/bits";

export const metadata = { title: "Goal" };

export default async function GoalDetailPage({ params }: PageProps<"/goals/[id]">) {
  await requireModule("projects");
  const { id } = await params;
  const goal = await getGoal(id);
  if (!goal) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={goal.title}
        description={`${goal.term}${goal.targetDate ? ` · target ${fmtDate(goal.targetDate)}` : ""}${goal.createdBy ? ` · created by ${goal.createdBy.firstName} ${goal.createdBy.lastName}` : ""}`}
        actions={
          <>
            <StatusBadge status={goal.status} />
            {goal.status === "ACTIVE" ? (
              <>
                <ConfirmButton action={setGoalStatus.bind(null, goal.id, "ACHIEVED")} message="Mark this goal as achieved?" variant="outline" size="sm">
                  Mark achieved
                </ConfirmButton>
                <ConfirmButton action={setGoalStatus.bind(null, goal.id, "DROPPED")} message="Archive this goal? Its projects stay where they are." variant="ghost" size="sm">
                  Archive
                </ConfirmButton>
              </>
            ) : (
              <ConfirmButton action={setGoalStatus.bind(null, goal.id, "ACTIVE")} message="Reopen this goal?" variant="outline" size="sm">
                Reopen
              </ConfirmButton>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ProgressBar progress={goal.progress} />
              <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Stat label="Projects" value={goal.projects.length} />
                <Stat label="Tasks" value={goal.progress.total} />
                <Stat label="Done" value={goal.progress.done} />
                <Stat label="Blocked" value={goal.progress.byStatus.BLOCKED} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Projects serving this goal</CardTitle>
              <Button asChild size="sm" variant="outline">
                <Link href={`/projects/new?goalId=${goal.id}`}>
                  <Plus /> Project
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {goal.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects yet. Add one so this goal has work behind it.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Project</TableHead>
                      <TableHead className="w-48">Progress</TableHead>
                      <TableHead className="hidden sm:table-cell">Due</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goal.projects.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="whitespace-normal font-medium">
                          <Link href={`/projects/${p.id}`} className="inline-flex items-center gap-2 hover:underline">
                            <ProjectDot color={p.color} /> {p.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <ProgressBar progress={p.progress} />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{fmtDate(p.dueDate)}</TableCell>
                        <TableCell>
                          <StatusBadge status={p.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2 self-start">
          <CardHeader>
            <CardTitle>Edit goal</CardTitle>
          </CardHeader>
          <CardContent>
            <GoalForm goal={goal} terms={goalTermOptions(goal.term)} defaultTerm={goal.term} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-heading text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
