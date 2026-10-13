import { requireModule } from "@/lib/auth/guards";
import { listActiveUsers, listGoalOptions } from "@/lib/projects/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectForm } from "@/components/projects/project-form";

export const metadata = { title: "New project" };

export default async function NewProjectPage({ searchParams }: PageProps<"/projects/new">) {
  await requireModule("projects");
  const sp = await searchParams;
  const [goals, users] = await Promise.all([listGoalOptions(), listActiveUsers()]);
  return (
    <div className="max-w-2xl">
      <PageHeader title="New project" description="A project groups tasks that serve one goal." />
      <Card>
        <CardContent>
          <ProjectForm goals={goals} users={users} defaultGoalId={typeof sp.goalId === "string" ? sp.goalId : undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
