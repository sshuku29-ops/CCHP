import Link from "next/link";
import { List, Columns3, GanttChart } from "lucide-react";
import { cn } from "@/lib/utils";

export const TASK_VIEWS = ["list", "board", "timeline"] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

/** Normalize a ?view= query value. */
export function parseView(v: string | string[] | undefined): TaskView {
  const s = Array.isArray(v) ? v[0] : v;
  return (TASK_VIEWS as readonly string[]).includes(s ?? "") ? (s as TaskView) : "list";
}

const LABELS: Record<TaskView, { label: string; Icon: typeof List }> = {
  list: { label: "List", Icon: List },
  board: { label: "Board", Icon: Columns3 },
  timeline: { label: "Timeline", Icon: GanttChart },
};

/**
 * List / Board / Timeline switcher. It is just three links that set ?view=…
 * and keep every other query parameter (filters) intact.
 */
export function ViewTabs({
  basePath,
  view,
  params,
}: {
  basePath: string;
  view: TaskView;
  params?: Record<string, string | undefined>;
}) {
  return (
    <div className="inline-flex h-8 items-center rounded-lg bg-muted p-[3px]" role="tablist" aria-label="Task view">
      {TASK_VIEWS.map((v) => {
        const { label, Icon } = LABELS[v];
        const qs = new URLSearchParams();
        for (const [k, val] of Object.entries(params ?? {})) if (val) qs.set(k, val);
        qs.set("view", v);
        const active = v === view;
        return (
          <Link
            key={v}
            href={`${basePath}?${qs.toString()}`}
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex h-full items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
              active ? "bg-background text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
