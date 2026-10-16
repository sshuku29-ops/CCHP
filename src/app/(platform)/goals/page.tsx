import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { requireModule } from "@/lib/auth/guards";
import { listGoals, listGoalTerms } from "@/lib/projects/queries";
import { fmtDate, termForDate } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar, ProjectDot } from "@/components/projects/bits";
import { cn } from "@/lib/utils";

export const metadata = { title: "Goals" };

export default async function GoalsPage({ searchParams }: PageProps<"/goals">) {
  await requireModule("projects");
  const sp = await searchParams;
  const term = typeof sp.term === "string" ? sp.term : "";
  const [goals, terms] = await Promise.all([listGoals(term ? { term } : {}), listGoalTerms()]);
  const currentTerm = termForDate(new Date());

  // Group goals by term, keeping the newest term first.
  const groups = new Map<string, typeof goals>();
  for (const g of goals) groups.set(g.term, [...(groups.get(g.term) ?? []), g]);

  return (
    <div>
      <PageHeader
        title="Goals"
        description="SMART goals by term. Progress rolls up from the tasks in each goal's projects."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href="/api/export/projects">
                <Download /> Export CSV
              </a>
            </Button>
            <Button asChild size="sm">
              <Link href="/goals/new">
                <Plus /> New goal
              </Link>
            </Button>
          </>
        }
      />

      {/* Term filter: plain links so it works without JS */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        <TermLink href="/goals" active={!term}>
          All terms
        </TermLink>
        {terms.map((t) => (
          <TermLink key={t} href={`/goals?term=${encodeURIComponent(t)}`} active={term === t}>
            {t}
            {t === currentTerm ? <span className="ml-1 text-xs opacity-70">(current)</span> : null}
          </TermLink>
        ))}
      </div>

      {goals.length === 0 ? (
        <EmptyState
          title={term ? `No goals for ${term}` : "No goals yet"}
          description="Goals give projects a reason to exist. Start with one SMART goal for this term."
          action={
            <Button asChild size="sm">
              <Link href="/goals/new">New goal</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {[...groups.entries()].map(([t, list]) => (
            <section key={t}>
              <h2 className="mb-3 font-heading text-lg font-semibold">
                {t}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {list.length} goal{list.length === 1 ? "" : "s"}
                </span>
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {list.map((g) => (
                  <Card key={g.id} size="sm" className={cn(g.status !== "ACTIVE" && "opacity-75")}>
                    <CardContent className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/goals/${g.id}`} className="font-heading text-base font-medium leading-snug hover:underline">
                          {g.title}
                        </Link>
                        <StatusBadge status={g.status} />
                      </div>
                      {g.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{g.description}</p> : null}
                      <ProgressBar progress={g.progress} />
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {g.projects.length} project{g.projects.length === 1 ? "" : "s"}
                        </span>
                        <span>{g.progress.total} tasks</span>
                        {g.targetDate ? <span>Target {fmtDate(g.targetDate)}</span> : null}
                      </div>
                      {g.projects.length > 0 ? (
                        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                          {g.projects.map((p) => (
                            <li key={p.id}>
                              <Link href={`/projects/${p.id}`} className="inline-flex items-center gap-1 hover:underline">
                                <ProjectDot color={p.color} /> {p.title}
                                <span className="text-muted-foreground">{p.progress.pct}%</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TermLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}
