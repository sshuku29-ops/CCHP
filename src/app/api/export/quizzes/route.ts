import { actionModule, AuthError } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { getQuizResults } from "@/lib/lms/queries";
import { toCsv, csvResponse } from "@/lib/csv";
import { fullName } from "@/lib/utils";

/** GET /api/export/quizzes?quizId= — CSV of each volunteer's best attempt at one quiz (LMS admins). */
export async function GET(req: Request) {
  try {
    await actionModule("lms");
  } catch (e) {
    if (e instanceof AuthError) return new Response(e.message, { status: e.status });
    throw e;
  }
  const quizId = new URL(req.url).searchParams.get("quizId") ?? "";
  if (!quizId) return new Response("quizId is required", { status: 400 });
  // Look up the module/course ids so we can reuse the same query the results page uses.
  const quiz = await db.quiz.findUnique({ where: { id: quizId }, select: { moduleId: true, module: { select: { courseId: true } } } });
  if (!quiz) return new Response("Quiz not found", { status: 404 });
  const results = await getQuizResults(quiz.module.courseId, quiz.moduleId, quizId);
  if (!results) return new Response("Quiz not found", { status: 404 });

  const csv = toCsv(
    results.rows.map((r) => ({
      volunteer: fullName(r.user),
      course: results.module.course.title,
      module: results.module.title,
      quiz: results.title,
      passPercent: results.passPercent,
      bestScore: r.best.score,
      total: r.best.total,
      bestPercent: r.best.percent,
      passed: r.best.passed ? "yes" : "no",
      attempts: r.attemptCount,
      lastAttemptAt: r.lastAttemptAt.toISOString(),
    })),
    ["volunteer", "course", "module", "quiz", "passPercent", "bestScore", "total", "bestPercent", "passed", "attempts", "lastAttemptAt"],
  );
  return csvResponse(`cchp-quiz-${quizId}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
