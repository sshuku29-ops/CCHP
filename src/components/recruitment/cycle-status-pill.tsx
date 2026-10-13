import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { cycleStatus, cycleStatusLabel, type CycleWindow } from "@/lib/recruitment/helpers";

const STYLES: Record<ReturnType<typeof cycleStatus>["kind"], string> = {
  OPEN: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  SCHEDULED: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
  DEADLINE_PASSED: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  CLOSED: "bg-muted text-muted-foreground",
};

/**
 * The one status pill for a recruitment cycle. Everything it says comes from
 * `cycleStatus()` so the header, the cycles table and the public cards never
 * disagree. `size="lg"` is the big pill on the cycle page; `compact` uses
 * the one-word labels for tables.
 */
export function CycleStatusPill({ cycle, compact = false, size = "sm", className }: { cycle: CycleWindow; compact?: boolean; size?: "sm" | "lg"; className?: string }) {
  const status = cycleStatus(cycle);
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-transparent font-semibold",
        size === "lg" && "h-auto px-3 py-1 text-sm tracking-wide",
        STYLES[status.kind],
        className,
      )}
    >
      {cycleStatusLabel(status, compact)}
    </Badge>
  );
}
