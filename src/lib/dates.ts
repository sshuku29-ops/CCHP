import { format } from "date-fns";

/** "Fall 2025" / "Spring 2026" / "Summer 2026" from a date. */
export function termForDate(d: Date): string {
  const m = d.getMonth(); // 0-11
  const y = d.getFullYear();
  if (m >= 7) return `Fall ${y}`; // Aug–Dec
  if (m <= 4) return `Spring ${y}`; // Jan–May
  return `Summer ${y}`;
}

/** Academic year label, e.g. 2025 for Fall 2025 through Summer 2026. */
export function academicYearForDate(d: Date): number {
  const m = d.getMonth();
  return m >= 7 ? d.getFullYear() : d.getFullYear() - 1;
}

export function academicYearLabel(startYear: number) {
  return `${startYear}–${String(startYear + 1).slice(2)}`;
}

/** Parse "YYYY-MM-DD" from an <input type="date"> into a UTC midnight Date. */
export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return isNaN(d.getTime()) ? null : d;
}

export function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export function fmtDate(d: Date | null | undefined, pattern = "MMM d, yyyy") {
  if (!d) return "—";
  // Date-only values are stored at UTC midnight; format them in UTC to avoid
  // off-by-one-day display in US timezones.
  const utc = new Date(d.getTime() + d.getTimezoneOffset() * 60_000);
  return format(utc, pattern);
}

export function fmtDateTime(d: Date | null | undefined) {
  if (!d) return "—";
  return format(d, "MMM d, yyyy h:mm a");
}

export function isOverdue(due: Date | null | undefined, status?: string) {
  if (!due) return false;
  if (status === "DONE") return false;
  return due.getTime() < Date.now() - 86_400_000;
}

export function listTerms(from: Date, to: Date): string[] {
  const out: string[] = [];
  const d = new Date(from);
  while (d <= to) {
    const t = termForDate(d);
    if (!out.includes(t)) out.push(t);
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}
