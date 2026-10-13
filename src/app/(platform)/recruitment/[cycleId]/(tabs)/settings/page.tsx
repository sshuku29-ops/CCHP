import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth/guards";
import { getCycle } from "@/lib/recruitment/queries";
import { deleteCycleAction } from "@/lib/recruitment/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { CycleSettingsForm } from "@/components/recruitment/cycle-settings-form";

export const metadata = { title: "Cycle settings" };

export default async function SettingsTab(props: PageProps<"/recruitment/[cycleId]/settings">) {
  await requireModule("recruitment");
  const { cycleId } = await props.params;
  const cycle = await getCycle(cycleId);
  if (!cycle) notFound();
  const canDelete = cycle._count.applications === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(300px,360px)]">
      <Card>
        <CardHeader>
          <CardTitle>Cycle details</CardTitle>
          <CardDescription>What applicants see on the public form, plus how reviewers see video answers.</CardDescription>
        </CardHeader>
        <CardContent>
          <CycleSettingsForm
            cycle={{
              id: cycle.id,
              name: cycle.name,
              type: cycle.type,
              slug: cycle.slug,
              description: cycle.description,
              videoReviewMode: cycle.videoReviewMode,
            }}
          />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Opening, closing and deadlines</CardTitle>
            <CardDescription>
              These are managed in the status panel at the top of this page (the same panel on every tab), so there is only one
              place to look.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Delete cycle</CardTitle>
            <CardDescription>
              {canDelete
                ? "Removes the cycle with its questions and rubric. This cannot be undone."
                : `This cycle has ${cycle._count.applications} application${cycle._count.applications === 1 ? "" : "s"} and cannot be deleted. Close it instead.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConfirmButton variant="destructive" disabled={!canDelete} message={`Delete "${cycle.name}"? This cannot be undone.`} action={deleteCycleAction.bind(null, cycle.id)}>
              Delete cycle
            </ConfirmButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
