import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { requireModule } from "@/lib/auth/guards";
import { getQuizResults } from "@/lib/lms/queries";
import { fmtDateTime } from "@/lib/dates";
import { fullName } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Quiz results" };

/**
 * /courses/[courseId]/modules/[moduleId]/quizzes/[quizId]/results — admin progress view.
 * One row per volunteer (best attempt + number of tries), sorted by last name. No ranking.
 */
export default async function QuizResultsPage(props: PageProps<"/courses/[courseId]/modules/[moduleId]/quizzes/[quizId]/results">) {
  await requireModule("lms");
  const { courseId, moduleId, quizId } = await props.params;
  const quiz = await getQuizResults(courseId, moduleId, quizId);
  if (!quiz) notFound();
  const base = `/courses/${courseId}/modules/${moduleId}`;
  const passedCount = quiz.rows.filter((r) => r.best.passed).length;

  return (
    <div className="max-w-4xl">
      <p className="text-sm mb-2">
        <Link href={base} className="text-muted-foreground hover:underline underline-offset-4">
          ← {quiz.module.title}
        </Link>
      </p>
      <PageHeader
        title={`Results: ${quiz.title}`}
        description={`${quiz.module.course.title} · ${quiz.questionCount} question${quiz.questionCount === 1 ? "" : "s"} · pass mark ${quiz.passPercent}%`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {passedCount}/{quiz.rows.length} passed
            </Badge>
            <Button asChild size="sm" variant="outline">
              <Link href={`${base}/quizzes/${quiz.id}/edit`}>Edit questions</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={`/api/export/quizzes?quizId=${quiz.id}`}>
                <Download /> Export CSV
              </a>
            </Button>
          </div>
        }
      />

      {quiz.rows.length === 0 ? (
        <EmptyState title="No attempts yet" description="Results appear here once a volunteer takes the quiz." />
      ) : (
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Volunteer</TableHead>
                <TableHead>Best score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Attempts</TableHead>
                <TableHead>Last attempt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quiz.rows.map((r) => (
                <TableRow key={r.user.id}>
                  <TableCell className="font-medium">{fullName(r.user)}</TableCell>
                  <TableCell>
                    {r.best.score}/{r.best.total} · {r.best.percent}%
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.best.passed ? "DONE" : "NEEDS_REVISION"} label={r.best.passed ? "Passed" : "Not passed"} />
                  </TableCell>
                  <TableCell className="text-right">{r.attemptCount}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDateTime(r.lastAttemptAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
