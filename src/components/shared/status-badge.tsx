import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  TODO: "bg-muted text-foreground",
  IN_PROGRESS: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
  DONE: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  BLOCKED: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
  ACTIVE: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  ACHIEVED: "bg-emerald-100 text-emerald-900",
  COMPLETED: "bg-emerald-100 text-emerald-900",
  ON_HOLD: "bg-amber-100 text-amber-900",
  DROPPED: "bg-muted text-muted-foreground",
  ARCHIVED: "bg-muted text-muted-foreground",
  WAITING: "bg-amber-100 text-amber-900",
  REPLIED: "bg-emerald-100 text-emerald-900",
  CLOSED: "bg-muted text-muted-foreground",
  NEW: "bg-blue-100 text-blue-900",
  DISCUSSED: "bg-amber-100 text-amber-900",
  ACTIONED: "bg-emerald-100 text-emerald-900",
  SUBMITTED: "bg-blue-100 text-blue-900",
  UNDER_REVIEW: "bg-amber-100 text-amber-900",
  INTERVIEW: "bg-violet-100 text-violet-900",
  ACCEPTED: "bg-emerald-100 text-emerald-900",
  REJECTED: "bg-red-100 text-red-900",
  WITHDRAWN: "bg-muted text-muted-foreground",
  REVIEWED: "bg-emerald-100 text-emerald-900",
  NEEDS_REVISION: "bg-amber-100 text-amber-900",
  DRAFT: "bg-muted text-foreground",
  PUBLISHED: "bg-emerald-100 text-emerald-900",
  HIGH: "bg-red-100 text-red-900",
  LOW: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent font-medium", STYLES[status] ?? "", className)}>
      {label ?? status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
    </Badge>
  );
}
