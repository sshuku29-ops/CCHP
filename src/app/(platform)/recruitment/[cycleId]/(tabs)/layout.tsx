import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth/guards";
import { getCycle } from "@/lib/recruitment/queries";
import { CYCLE_TYPE_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { CycleTabs, type CycleTabKey } from "@/components/recruitment/cycle-tabs";
import { CycleStatusPanel } from "@/components/recruitment/cycle-status-panel";

/**
 * Shared header + tab strip for /recruitment/[cycleId]{,/questions,/rubric,/settings}.
 * The review page lives outside this route group so it has no tabs.
 */
export default async function CycleLayout({ children, params }: LayoutProps<"/recruitment/[cycleId]">) {
  await requireModule("recruitment");
  const { cycleId } = await params;
  const cycle = await getCycle(cycleId);
  if (!cycle) notFound();

  // Which tab is active? The proxy stamps x-pathname on every request.
  const pathname = (await headers()).get("x-pathname") ?? "";
  const active: CycleTabKey = pathname.endsWith("/questions")
    ? "questions"
    : pathname.endsWith("/rubric")
      ? "rubric"
      : pathname.endsWith("/settings")
        ? "settings"
        : "applications";

  return (
    <div>
      <div className="mb-2 text-sm">
        <Link href="/recruitment" className="text-muted-foreground hover:text-foreground">
          ← All cycles
        </Link>
      </div>
      <PageHeader title={cycle.name} description={CYCLE_TYPE_LABELS[cycle.type as keyof typeof CYCLE_TYPE_LABELS] ?? cycle.type} />
      {/* Status, public link, deadline form and the manual open/close buttons — one place, on every tab. */}
      <CycleStatusPanel cycle={cycle} />
      <CycleTabs
        cycleId={cycle.id}
        active={active}
        counts={{ applications: cycle._count.applications, questions: cycle.questions.length, rubric: cycle.criteria.length }}
      />
      {children}
    </div>
  );
}
