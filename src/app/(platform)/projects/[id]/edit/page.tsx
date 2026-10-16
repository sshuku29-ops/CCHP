import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { listActiveUsers, listGoalOptions } from "@/lib/projects/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectForm } from "@/components/projects/project-form";

export const metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: PageProps<"/projects/[id]/edit">) {
  await requireModule("projects");
  const { id } = await params;
  const [project, goals, users] = await Promise.all([db.project.findUnique({ where: { id } }), listGoalOptions(), listActiveUsers()]);
  if (!project) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Edit project"
        description={project.title}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={`/projects/${project.id}`}>Back to project</Link>
          </Button>
        }
      />
      <Card>
        <CardContent>
          <ProjectForm project={project} goals={goals} users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
