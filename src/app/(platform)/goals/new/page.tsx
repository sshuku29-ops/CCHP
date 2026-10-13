import { requireModule } from "@/lib/auth/guards";
import { termForDate } from "@/lib/dates";
import { goalTermOptions } from "@/lib/projects/terms";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { GoalForm } from "@/components/projects/goal-form";

export const metadata = { title: "New goal" };

export default async function NewGoalPage() {
  await requireModule("projects");
  return (
    <div className="max-w-2xl">
      <PageHeader title="New goal" description="Write it SMART: specific, measurable, achievable, relevant, time-bound." />
      <Card>
        <CardContent>
          <GoalForm terms={goalTermOptions()} defaultTerm={termForDate(new Date())} />
        </CardContent>
      </Card>
    </div>
  );
}
