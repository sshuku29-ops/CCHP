import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { anonCode, isCycleOpenNow } from "./helpers";

// ─────────────────────────── Public (no login) ───────────────────────────

/** Cycles that are currently accepting applications, for the public /apply page. */
export async function listOpenCycles() {
  const cycles = await db.recruitmentCycle.findMany({
    where: { isOpen: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true, slug: true, description: true, isOpen: true, opensAt: true, closesAt: true },
  });
  return cycles.filter((c) => isCycleOpenNow(c));
}

/** One open cycle with its questions in order, or null if it is closed/missing. Cached per request. */
export const getOpenCycleBySlug = cache(async (slug: string) => {
  const cycle = await db.recruitmentCycle.findUnique({
    where: { slug },
    select: {
      id: true, name: true, type: true, slug: true, description: true, isOpen: true, opensAt: true, closesAt: true,
      questions: { orderBy: [{ order: "asc" }, { id: "asc" }], select: { id: true, prompt: true, helpText: true, type: true, required: true } },
    },
  });
  if (!cycle || !isCycleOpenNow(cycle)) return null;
  return cycle;
});

// ─────────────────────────── Admin: cycles ───────────────────────────

export async function listCycles() {
  return db.recruitmentCycle.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: { _count: { select: { applications: true } } },
  });
}

/** Cycle with ordered questions + criteria and an application count. */
export async function getCycle(cycleId: string) {
  return db.recruitmentCycle.findUnique({
    where: { id: cycleId },
    include: {
      questions: { orderBy: [{ order: "asc" }, { id: "asc" }] },
      criteria: { orderBy: [{ order: "asc" }, { id: "asc" }] },
      _count: { select: { applications: true } },
    },
  });
}

// ─────────────────────────── Admin: ranked list ───────────────────────────

export type MyScoreStatus = "done" | "partial" | "not_started";

export type RankedApplication = {
  id: string;
  code: string;
  // PII — the applications page only shows these when ?reveal=1 is set,
  // and the CSV export (admin only) always includes them.
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  affiliation: string | null;
  status: string;
  flaggedForInterview: boolean;
  submittedAt: Date;
  /** Mean of the totals of reviewers who scored every criterion; null if none. */
  average: number | null;
  /** Reviewers who have saved at least one score. */
  reviewersScored: number;
  /** Reviewers who have scored every criterion (the ones counted in `average`). */
  reviewersComplete: number;
  myStatus: MyScoreStatus;
};

/**
 * Every application in a cycle, ranked by average score (highest first;
 * unscored last; ties broken by submission time). Used by the applications
 * tab and the CSV export. Admin-only callers.
 */
export async function rankApplications(cycleId: string, currentUserId: string) {
  const cycle = await db.recruitmentCycle.findUnique({
    where: { id: cycleId },
    select: {
      id: true, name: true, type: true, slug: true,
      criteria: { orderBy: [{ order: "asc" }, { id: "asc" }], select: { id: true, name: true, maxScore: true } },
    },
  });
  if (!cycle) return null;

  const criterionIds = new Set(cycle.criteria.map((c) => c.id));
  const maxTotal = cycle.criteria.reduce((sum, c) => sum + c.maxScore, 0);

  const apps = await db.application.findMany({
    where: { cycleId },
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true, affiliation: true,
      status: true, flaggedForInterview: true, submittedAt: true,
      scores: { select: { reviewerId: true, criterionId: true, score: true } },
    },
  });

  const ranked: RankedApplication[] = apps.map((a, index) => {
    // reviewerId -> (criterionId -> score). Ignore scores for criteria that
    // were deleted since they were given.
    const byReviewer = new Map<string, Map<string, number>>();
    for (const s of a.scores) {
      if (!criterionIds.has(s.criterionId)) continue;
      let m = byReviewer.get(s.reviewerId);
      if (!m) byReviewer.set(s.reviewerId, (m = new Map()));
      m.set(s.criterionId, s.score);
    }
    let reviewersComplete = 0;
    let sumOfTotals = 0;
    for (const m of byReviewer.values()) {
      if (criterionIds.size > 0 && m.size === criterionIds.size) {
        reviewersComplete++;
        for (const v of m.values()) sumOfTotals += v;
      }
    }
    const mine = byReviewer.get(currentUserId);
    const myStatus: MyScoreStatus = !mine || mine.size === 0 ? "not_started" : mine.size === criterionIds.size ? "done" : "partial";
    const { scores: _scores, ...rest } = a;
    void _scores;
    return {
      ...rest,
      code: anonCode(index),
      average: reviewersComplete > 0 ? sumOfTotals / reviewersComplete : null,
      reviewersScored: byReviewer.size,
      reviewersComplete,
      myStatus,
    };
  });

  ranked.sort((x, y) => {
    if (x.average !== y.average) {
      if (x.average === null) return 1;
      if (y.average === null) return -1;
      return y.average - x.average;
    }
    return x.submittedAt.getTime() - y.submittedAt.getTime();
  });

  return { cycle, maxTotal, applications: ranked };
}

// ─────────────────────────── Admin: anonymized review ───────────────────────────

/**
 * One application for the anonymized review page. The Prisma `select` below
 * deliberately omits firstName, lastName, email and phone so PII never
 * reaches this page — not even in the server payload.
 */
export async function getApplicationForReview(applicationId: string, reviewerId: string) {
  const app = await db.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      cycleId: true,
      affiliation: true,
      status: true,
      flaggedForInterview: true,
      submittedAt: true,
      answers: { select: { questionId: true, text: true, videoUrl: true } },
      scores: { where: { reviewerId }, select: { criterionId: true, score: true } },
      reviewNotes: { where: { reviewerId }, select: { body: true } },
      cycle: {
        select: {
          id: true, name: true, type: true, videoReviewMode: true,
          questions: { orderBy: [{ order: "asc" }, { id: "asc" }], select: { id: true, prompt: true, helpText: true, type: true, required: true } },
          criteria: { orderBy: [{ order: "asc" }, { id: "asc" }], select: { id: true, name: true, description: true, maxScore: true } },
        },
      },
    },
  });
  if (!app) return null;

  // Position in the cycle (for the anonymous code and prev/next links).
  const order = await db.application.findMany({
    where: { cycleId: app.cycleId },
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const index = order.findIndex((o) => o.id === app.id);

  const answerByQuestion = new Map(app.answers.map((a) => [a.questionId, a]));
  const myScores = new Map(app.scores.map((s) => [s.criterionId, s.score]));
  const hasScoredEverything = app.cycle.criteria.length > 0 && app.cycle.criteria.every((c) => myScores.has(c.id));

  return {
    id: app.id,
    cycle: app.cycle,
    affiliation: app.affiliation,
    status: app.status,
    flaggedForInterview: app.flaggedForInterview,
    submittedAt: app.submittedAt,
    code: anonCode(index),
    position: index + 1,
    total: order.length,
    prevId: index > 0 ? order[index - 1].id : null,
    nextId: index >= 0 && index < order.length - 1 ? order[index + 1].id : null,
    questions: app.cycle.questions.map((q) => ({ ...q, answer: answerByQuestion.get(q.id) ?? null })),
    myScores,
    myNote: app.reviewNotes[0]?.body ?? "",
    hasScoredEverything,
  };
}
