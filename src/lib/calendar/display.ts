// Pure display helpers shared by the server page and the client month grid.

export const TYPE_STYLES: Record<string, string> = {
  MEETING: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
  SESSION: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  DEADLINE: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  FOLLOW_UP: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100",
  OTHER: "bg-muted text-foreground",
};

export const TYPE_LABELS: Record<string, string> = {
  MEETING: "Meeting",
  SESSION: "Session",
  DEADLINE: "Task due",
  FOLLOW_UP: "Follow-up",
  OTHER: "Other",
};

/** "Tuesday, Oct 14" from a "YYYY-MM-DD" key, without timezone surprises. */
export function formatDayLabel(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
}
