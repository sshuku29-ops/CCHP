import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { listCourses, canManageLms } from "@/lib/lms/queries";
import { fmtDate } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CourseForm } from "@/components/lms/course-form";

export const metadata = { title: "Training" };

/** /courses — every published course (admins with "lms" also see drafts and can add courses). */
export default async function CoursesPage() {
  const user = await requireUser();
  const manage = canManageLms(user);
  const courses = await listCourses(user);

  return (
    <div>
      <PageHeader
        title="Training"
        description="Volunteer training courses. Work through each module, mark it complete, and submit assignments."
        actions={
          manage ? (
            <Button asChild variant="outline">
              <Link href="/courses/submissions">Review queue</Link>
            </Button>
          ) : null
        }
      />

      {courses.length === 0 ? (
        <EmptyState title="No courses yet" description={manage ? "Create the first course below." : "Your leaders have not published a course yet."} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const pct = c.moduleCount ? Math.round((c.completedCount / c.moduleCount) * 100) : 0;
            return (
              <Card key={c.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-2">
                    <Link href={`/courses/${c.id}`} className="hover:underline underline-offset-4">
                      {c.title}
                    </Link>
                    {!c.isPublished ? <Badge variant="outline">Draft</Badge> : null}
                  </CardTitle>
                  {c.description ? <CardDescription className="line-clamp-3">{c.description}</CardDescription> : null}
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>
                        {c.moduleCount} module{c.moduleCount === 1 ? "" : "s"}
                      </span>
                      <span>
                        {c.completedCount}/{c.moduleCount} complete
                      </span>
                    </div>
                    <Progress value={pct} aria-label={`${pct}% complete`} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.nextDue ? (
                      <>
                        Next due:{" "}
                        <Link href={`/courses/${c.id}/modules/${c.nextDue.moduleId}/assignments/${c.nextDue.id}`} className="underline underline-offset-4">
                          {c.nextDue.title}
                        </Link>{" "}
                        · {fmtDate(c.nextDue.dueDate)}
                      </>
                    ) : (
                      "No upcoming assignments"
                    )}
                  </p>
                  <Button asChild size="sm" variant="secondary" className="w-full">
                    <Link href={`/courses/${c.id}`}>Open course</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {manage ? (
        <Card className="mt-8 max-w-xl">
          <CardHeader>
            <CardTitle>New course</CardTitle>
            <CardDescription>Create a course, then add modules on its page. Leave it unpublished until it is ready.</CardDescription>
          </CardHeader>
          <CardContent>
            <CourseForm />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
