// Single source of truth for every "string enum" stored in the database.
// Keep these in sync with prisma/schema.prisma comments.

export const ROLES = ["MAIN_ADMIN", "ADMIN", "VOLUNTEER"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  MAIN_ADMIN: "Main Admin",
  ADMIN: "Admin",
  VOLUNTEER: "Volunteer",
};

// Platform modules an Admin can be scoped to. null allowedModules = all.
export const MODULES = [
  "projects",
  "recruitment",
  "lms",
  "records",
  "reports",
  "volunteers",
  "site",
  "handoff",
] as const;
export type ModuleKey = (typeof MODULES)[number];
export const MODULE_LABELS: Record<ModuleKey, string> = {
  projects: "Projects & tasks",
  recruitment: "Recruitment",
  lms: "Training (LMS)",
  records: "Session records",
  reports: "Annual reports",
  volunteers: "Volunteer directory",
  site: "Public site content",
  handoff: "Handoff docs",
};

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  BLOCKED: "Blocked",
};
export const TASK_PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const;

export const GOAL_STATUSES = ["ACTIVE", "ACHIEVED", "DROPPED"] as const;
export const PROJECT_STATUSES = ["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"] as const;

export const WAITING_STATUSES = ["WAITING", "REPLIED", "CLOSED"] as const;
export const WAITING_CHANNELS = ["email", "phone", "in person", "other"] as const;

export const FEEDBACK_CATEGORIES = ["IDEA", "ISSUE", "PRAISE", "OTHER"] as const;
export const FEEDBACK_STATUSES = ["NEW", "DISCUSSED", "ACTIONED", "ARCHIVED"] as const;

export const EVENT_TYPES = ["MEETING", "SESSION", "DEADLINE", "OTHER"] as const;

export const CYCLE_TYPES = ["VOLUNTEER", "LEADERSHIP", "PARTNER"] as const;
export const CYCLE_TYPE_LABELS: Record<(typeof CYCLE_TYPES)[number], string> = {
  VOLUNTEER: "Volunteer",
  LEADERSHIP: "Leadership",
  PARTNER: "Faculty / staff / partner",
};
export const QUESTION_TYPES = ["SHORT_TEXT", "LONG_TEXT", "VIDEO_LINK"] as const;
export const APPLICATION_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INTERVIEW",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
] as const;
export const VIDEO_REVIEW_MODES = ["AFTER", "BEFORE"] as const;

export const SUBMISSION_TYPES = ["TEXT", "FILE", "VIDEO_LINK", "ANY"] as const;
export const SUBMISSION_STATUSES = ["SUBMITTED", "REVIEWED", "NEEDS_REVISION"] as const;

export const HOURS_TYPES = ["FORMAL_SESSION", "INFORMAL_SESSION", "PREP", "OTHER"] as const;
export const HOURS_TYPE_LABELS: Record<(typeof HOURS_TYPES)[number], string> = {
  FORMAL_SESSION: "Formal session",
  INFORMAL_SESSION: "Informal session",
  PREP: "Prep / research",
  OTHER: "Other",
};

export const SESSION_TYPES = ["FORMAL", "INFORMAL"] as const;
export const REPORT_STATUSES = ["DRAFT", "PUBLISHED"] as const;

export const LEADERSHIP_ROLES = [
  "Executive Director",
  "Executive Assistant (Vice Chair)",
  "Formal Sessions Director",
  "Informal Sessions Director",
  "Educational Content & Media Director",
  "Systems & Data Management Director",
] as const;

export const SESSION_COOKIE = "cchp_session";
export const SESSION_DAYS = 30;
