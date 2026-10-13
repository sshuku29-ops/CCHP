import { requireModule } from "@/lib/auth/guards";
import { listActiveUsers, listProjectOptions } from "@/lib/projects/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TaskForm } from "@/components/projects/task-form";

export const metadata = { title: "New task" };

export default async function NewTaskPage({ searchParams }: PageProps<"/tasks/new">) {
  await requireModule("projects");
  const sp = await searchParams;
  const [projects, users] = await Promise.all([listProjectOptions({ activeOnly: true }), listActiveUsers()]);
  return (
    <div className="max-w-3xl">
      <PageHeader title="New task" description="Give it a clear title, a due date and an owner. Unassigned tasks can be flagged as needing an owner." />
      <Card>
        <CardContent>
          <TaskForm projects={projects} users={users} defaultProjectId={typeof sp.projectId === "string" ? sp.projectId : undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
