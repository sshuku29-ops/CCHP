import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "applications", label: "Applications", suffix: "" },
  { key: "questions", label: "Questions", suffix: "/questions" },
  { key: "rubric", label: "Rubric", suffix: "/rubric" },
  { key: "settings", label: "Settings", suffix: "/settings" },
] as const;

export type CycleTabKey = (typeof TABS)[number]["key"];

/** Link-based tabs (server-rendered, shareable URLs). */
export function CycleTabs({ cycleId, active, counts }: { cycleId: string; active: CycleTabKey; counts?: Partial<Record<CycleTabKey, number>> }) {
  return (
    <nav aria-label="Cycle sections" className="mb-6 flex flex-wrap gap-1 border-b">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/recruitment/${cycleId}${t.suffix}`}
          aria-current={active === t.key ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            active === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {counts?.[t.key] !== undefined ? <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{counts[t.key]}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
