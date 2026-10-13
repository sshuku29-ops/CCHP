import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, Circle, ChevronUp, ChevronDown } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getCourse, canManageLms } from "@/lib/lms/queries";
import { moveModule, deleteModule, deleteCourse } from "@/lib/lms/actions";
import { fmtDate } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseForm } from "@/components/lms/course-form";
import { ModuleAddForm } from "@/components/lms/module-forms";

export const metadata = { title: "Course" };

/** /courses/[courseId] — course overview with its ordered modules. */
export default async function CoursePage(props: PageProps<"/courses/[courseId]">) {
  const user = await requireUser();
  const { courseId } = await props.params;
  const course = await getCourse(courseId, user);
  if (!course) notFound();
  const manage = canManageLms(user);
  const done = course.modules.filter((m) => m.completed).length;

  const moduleList =
    course.modules.length === 0 ? (
      <EmptyState title="No modules yet" description={manage ? "Add the first module from the Manage tab." : "Check back soon."} />
    ) : (
      <ol className="space-y-3">
        {course.modules.map((m, i) => (
          <li key={m.id}>
            <Link href={`/courses/${course.id}/modules/${m.id}`} className="block rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40">
              <div className="flex items-start gap-3">
                {m.completed ? (
                  <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-label="Completed" />
                ) : (
                  <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground/50" aria-label="Not completed" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    <span className="text-muted-foreground mr-2">{i + 1}.</span>
                    {m.title}
                  </p>
                  {m.summary ? <p className="text-sm text-muted-foreground mt-0.5">{m.summary}</p> : null}
                  <p className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Due: {fmtDate(m.dueDate)}</span>
                    <span>
                      {m.assignmentCount} assignment{m.assignmentCount === 1 ? "" : "s"}
                    </span>
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    );

  return (
    <div className="max-w-3xl">
      <p className="text-sm mb-2">
        <Link href="/courses" className="text-muted-foreground hover:underline underline-offset-4">
          ← All courses
        </Link>
      </p>
      <PageHeader
        title={course.title}
        description={course.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            {!course.isPublished ? <Badge variant="outline">Draft — hidden from volunteers</Badge> : null}
            <Badge variant="secondary">
              {done}/{course.modules.length} modules complete
            </Badge>
          </div>
        }
      />

      {!manage ? (
        moduleList
      ) : (
        <Tabs defaultValue="modules">
          <TabsList>
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
          </TabsList>
          <TabsContent value="modules" className="pt-4">
            {moduleList}
          </TabsContent>
          <TabsContent value="manage" className="pt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course details</CardTitle>
              </CardHeader>
              <CardContent>
                <CourseForm course={course} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Module order</CardTitle>
                <CardDescription>Use the arrows to reorder. Open a module to edit its content.</CardDescription>
              </CardHeader>
              <CardContent>
                {course.modules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No modules yet.</p>
                ) : (
                  <ul className="divide-y">
                    {course.modules.map((m, i) => (
                      <li key={m.id} className="flex items-center gap-2 py-2">
                        <span className="w-6 text-sm text-muted-foreground">{i + 1}.</span>
                        <Link href={`/courses/${course.id}/modules/${m.id}`} className="flex-1 text-sm font-medium hover:underline underline-offset-4 min-w-0 truncate">
                          {m.title}
                        </Link>
                        <form action={moveModule.bind(null, m.id, "up")}>
                          <Button type="submit" size="icon-sm" variant="ghost" disabled={i === 0} aria-label="Move up">
                            <ChevronUp />
                          </Button>
                        </form>
                        <form action={moveModule.bind(null, m.id, "down")}>
                          <Button type="submit" size="icon-sm" variant="ghost" disabled={i === course.modules.length - 1} aria-label="Move down">
                            <ChevronDown />
                          </Button>
                        </form>
                        <ConfirmButton
                          action={deleteModule.bind(null, m.id)}
                          message={`Delete "${m.title}" and all of its resources, videos, assignments and submissions?`}
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                        >
                          Delete
                        </ConfirmButton>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add module</CardTitle>
              </CardHeader>
              <CardContent>
                <ModuleAddForm courseId={course.id} />
              </CardContent>
            </Card>

            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle>Danger zone</CardTitle>
                <CardDescription>Deleting a course removes every module, assignment and submission in it.</CardDescription>
              </CardHeader>
              <CardContent>
                <ConfirmButton action={deleteCourse.bind(null, course.id)} message={`Delete the course "${course.title}"? This cannot be undone.`} variant="destructive" size="sm">
                  Delete course
                </ConfirmButton>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
