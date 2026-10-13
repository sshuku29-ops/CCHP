// Pure helpers for the recruitment module. No database access here, so these
// can be imported from both server and client components.

import type { ActionResult } from "@/lib/action-result";
import { CYCLE_TYPES, APPLICATION_STATUSES, VIDEO_REVIEW_MODES } from "@/lib/constants";

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

/**
 * A cycle accepts applications when it is marked open AND today is inside
 * its optional date window. `closesAt` is a date-only value (UTC midnight),
 * so we treat it as inclusive: applications close at the END of that day.
 */
export function isCycleOpenNow(
  cycle: { isOpen: boolean; opensAt: Date | null; closesAt: Date | null },
  now: Date = new Date(),
) {
  if (!cycle.isOpen) return false;
  if (cycle.opensAt && cycle.opensAt.getTime() > now.getTime()) return false;
  if (cycle.closesAt && cycle.closesAt.getTime() + 86_400_000 <= now.getTime()) return false;
  return true;
}

/** Short human description of the date window for admin tables. */
export function cycleWindowLabel(cycle: { opensAt: Date | null; closesAt: Date | null }, fmt: (d: Date | null) => string) {
  if (!cycle.opensAt && !cycle.closesAt) return "No dates set";
  return `${cycle.opensAt ? fmt(cycle.opensAt) : "Any time"} → ${cycle.closesAt ? fmt(cycle.closesAt) : "no end date"}`;
}

/**
 * Timestamp embedded in the public form when it is rendered, for the
 * minimum-time anti-spam check. Server components render once per request,
 * so this is stable for the lifetime of the page.
 */
export function formRenderedAt() {
  return Date.now();
}
