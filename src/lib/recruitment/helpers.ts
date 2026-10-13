// Pure helpers for the recruitment module. No database access here, so these
// can be imported from both server and client components.

import type { ActionResult } from "@/lib/action-result";
import { CYCLE_TYPES, APPLICATION_STATUSES, VIDEO_REVIEW_MODES } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";

export type CycleType = (typeof CYCLE_TYPES)[number];
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type VideoReviewMode = (typeof VIDEO_REVIEW_MODES)[number];

/**
 * Form actions in this module return the normal ActionResult plus `values`:
 * the text the person typed, echoed back so the form can keep it after an
 * error (React resets uncontrolled forms when an action finishes).
 */
export type FormResult = (NonNullable<ActionResult> & { values?: Record<string, string> }) | null;

/** Copy every string field of a FormData into a plain object (for `values`). */
export function formValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  INTERVIEW: "Interview",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const VIDEO_REVIEW_MODE_LABELS: Record<VideoReviewMode, string> = {
  AFTER: "After scoring (recommended)",
  BEFORE: "While scoring",
};

export const VIDEO_REVIEW_MODE_HELP: Record<VideoReviewMode, string> = {
  AFTER:
    "Reviewers score the written answers first. A video answer only unlocks for a reviewer once they have saved a score for every rubric criterion. This keeps the written review as anonymous as possible.",
  BEFORE: "Video answers are visible alongside the written answers while scoring.",
};

export const QUESTION_TYPE_LABELS = {
  SHORT_TEXT: "Short text (one line)",
  LONG_TEXT: "Long text (paragraph, 2000 characters max)",
  VIDEO_LINK: "Video link (unlisted YouTube)",
} as const;

/** Label for the "affiliation" field, which differs by applicant type. */
export function affiliationLabel(type: string) {
  return type === "PARTNER" ? "Department / organization" : "Class year";
}

/**
 * Anonymous code shown to reviewers instead of a name, e.g. "A-017".
 * `index` is the application's position (0-based) in submittedAt order
 * within its cycle. Nothing is stored; it is recomputed on every read.
 */
export function anonCode(index: number) {
  return `A-${String(index + 1).padStart(3, "0")}`;
}

/** "Volunteer applications — Spring 2026" -> "volunteer-applications-spring-2026" */
export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "cycle";
}

const DAY_MS = 86_400_000;

/** The fields every open/closed decision is based on. */
export type CycleWindow = { isOpen: boolean; opensAt: Date | null; closesAt: Date | null };

/**
 * The effective state of a cycle right now. This is THE single place that
 * decides whether applications are accepted — the status pill, the /apply
 * pages and the submit action all go through it.
 *
 *   - CLOSED            the manual switch is off (dates are ignored)
 *   - SCHEDULED         switch is on, but "Opens on" is still in the future
 *   - DEADLINE_PASSED   switch is on, but "Closes on" has gone by
 *   - OPEN              switch is on and today is inside the date window
 *
 * `closesAt` is a date-only value (UTC midnight) and is inclusive:
 * applications close at the END of that day.
 */
export type CycleStatus =
  | { kind: "OPEN"; closesAt: Date | null }
  | { kind: "SCHEDULED"; opensAt: Date }
  | { kind: "DEADLINE_PASSED"; closesAt: Date }
  | { kind: "CLOSED" };

export function cycleStatus(cycle: CycleWindow, now: Date = new Date()): CycleStatus {
  if (!cycle.isOpen) return { kind: "CLOSED" };
  if (cycle.opensAt && cycle.opensAt.getTime() > now.getTime()) return { kind: "SCHEDULED", opensAt: cycle.opensAt };
  if (cycle.closesAt && cycle.closesAt.getTime() + DAY_MS <= now.getTime()) return { kind: "DEADLINE_PASSED", closesAt: cycle.closesAt };
  return { kind: "OPEN", closesAt: cycle.closesAt };
}

/** True when the public form accepts applications right now. */
export function isCycleOpenNow(cycle: CycleWindow, now: Date = new Date()) {
  return cycleStatus(cycle, now).kind === "OPEN";
}

/**
 * Text for the status pill. `compact` gives the short form used in tables
 * ("Open"); the default is the long form for the cycle page header
 * ("OPEN — accepting applications").
 */
export function cycleStatusLabel(status: CycleStatus, compact = false): string {
  switch (status.kind) {
    case "OPEN":
      return compact ? "Open" : "OPEN — accepting applications";
    case "SCHEDULED":
      return compact ? "Scheduled" : `SCHEDULED — opens ${fmtDate(status.opensAt)}`;
    case "DEADLINE_PASSED":
      return compact ? "Deadline passed" : `CLOSED — deadline passed ${fmtDate(status.closesAt)}`;
    case "CLOSED":
      return compact ? "Closed" : "CLOSED";
  }
}

/** "Closes Mar 1, 2026" or "Open until further notice" — for cards and tables. */
export function closesLabel(closesAt: Date | null) {
  return closesAt ? `Closes ${fmtDate(closesAt)}` : "Open until further notice";
}

/** Full sentence for the deadline, used on the public form and the status panel. */
export function deadlineSentence(closesAt: Date | null) {
  return closesAt ? `Applications close at 11:59 pm on ${fmtDate(closesAt)}.` : "No deadline — applications stay open until you close the cycle.";
}

/**
 * Whole days left until the deadline (0 = closes tonight). Null when there is
 * no deadline. Used for the "closing soon" nudge on the Recruitment page.
 */
export function daysUntilClose(closesAt: Date | null, now: Date = new Date()): number | null {
  if (!closesAt) return null;
  return Math.floor((closesAt.getTime() + DAY_MS - now.getTime()) / DAY_MS);
}

/**
 * The manual switch is OFF but an "Opens on" date is still ahead. Nothing will
 * happen on that date by itself, so the status panel points this out.
 */
export function hasPendingOpenDate(cycle: CycleWindow, now: Date = new Date()) {
  return !cycle.isOpen && !!cycle.opensAt && cycle.opensAt.getTime() > now.getTime();
}

/** Open right now AND the deadline is within `withinDays` days. */
export function isClosingSoon(cycle: CycleWindow, now: Date = new Date(), withinDays = 3) {
  const status = cycleStatus(cycle, now);
  if (status.kind !== "OPEN" || !status.closesAt) return false;
  const days = daysUntilClose(status.closesAt, now);
  return days !== null && days <= withinDays;
}

/**
 * Timestamp embedded in the public form when it is rendered, for the
 * minimum-time anti-spam check. Server components render once per request,
 * so this is stable for the lifetime of the page.
 */
export function formRenderedAt() {
  return Date.now();
}
