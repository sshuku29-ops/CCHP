import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth/guards";
import { getCycle } from "@/lib/recruitment/queries";
import { deleteCriterionAction, moveCriterionAction } from "@/lib/recruitment/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { ActionButton } from "@/components/recruitment/action-button";
import { CriterionForm } from "@/components/recruitment/criterion-form";

export const metadata = { title: "Rubric" };

/** Scoring criteria for a cycle: add / edit / delete / reorder. */
export default async function RubricTab(props: PageProps<"/recruitment/[cycleId]/rubric">) {
  await requireModule("recruitment");
  const { cycleId } = await props.params;
  const sp = await props.searchParams;
  const editId = typeof sp.edit === "string" ? sp.edit : null;
  const cycle = await getCycle(cycleId);
  if (!cycle) notFound();
  const maxTotal = cycle.criteria.reduce((s, c) => s + c.maxScore, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,400px)]">
      <div className="space-y-4">
        {cycle._count.applications > 0 ? (
          <Alert>
            <AlertTitle>Scoring may already be under way</AlertTitle>
            <AlertDescription>
              Changing the rubric mid-review makes earlier scores hard to compare. Deleting a criterion deletes every score given for it; lowering a max
              score clamps existing scores to the new maximum.
            </AlertDescription>
          </Alert>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Each reviewer gives every application a score per criterion. Totals are out of <strong>{maxTotal}</strong>.
        </p>

        {cycle.criteria.length === 0 ? (
          <EmptyState title="No criteria" description="Add at least one criterion so reviewers can score applications." />
        ) : (
          <ol className="space-y-3">
            {cycle.criteria.map((c, i) => (
              <li key={c.id}>
                <Card>
                  <CardContent className="py-4">
                    {editId === c.id ? (
                      <CriterionForm cycleId={cycle.id} criterion={c} />
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {i + 1}. {c.name} <Badge variant="secondary">1–{c.maxScore}</Badge>
                          </p>
                          {c.description ? <p className="mt-1 text-sm text-muted-foreground">{c.description}</p> : null}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1">
                          <ActionButton size="icon-sm" variant="ghost" aria-label="Move up" disabled={i === 0} action={moveCriterionAction.bind(null, c.id, "up")}>
                            ↑
                          </ActionButton>
                          <ActionButton size="icon-sm" variant="ghost" aria-label="Move down" disabled={i === cycle.criteria.length - 1} action={moveCriterionAction.bind(null, c.id, "down")}>
                            ↓
                          </ActionButton>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/recruitment/${cycle.id}/rubric?edit=${c.id}`}>Edit</Link>
                          </Button>
                          <ConfirmButton
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            message="Delete this criterion and every score given for it?"
                            action={deleteCriterionAction.bind(null, c.id)}
                          >
                            Delete
                          </ConfirmButton>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Add a criterion</CardTitle>
          <CardDescription>3–5 criteria on a 1–5 scale works well. Max score can be 1–10.</CardDescription>
        </CardHeader>
        <CardContent>
          <CriterionForm cycleId={cycle.id} />
        </CardContent>
      </Card>
    </div>
  );
}
