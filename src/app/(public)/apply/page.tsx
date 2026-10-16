import Link from "next/link";
import { listOpenCycles } from "@/lib/recruitment/queries";
import { CYCLE_TYPES, CYCLE_TYPE_LABELS } from "@/lib/constants";
import { closesLabel } from "@/lib/recruitment/helpers";
import { Button } from "@/components/ui/button";
import { CycleStatusPill } from "@/components/recruitment/cycle-status-pill";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Apply" };

/** Public list of every application that is currently open, grouped by type. */
export default async function ApplyIndexPage() {
  const cycles = await listOpenCycles();
  const groups = CYCLE_TYPES.map((type) => ({ type, cycles: cycles.filter((c) => c.type === type) })).filter((g) => g.cycles.length > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">Join CCHP</h1>
        <p className="mt-2 text-muted-foreground">
          We are a team of Colby students who run free health and wellness sessions at the Mid-Maine Homeless Shelter.
          No account is needed to apply — just a few short answers and an email address so we can follow up.
        </p>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium">No applications are open right now.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Volunteer applications usually open each February. Check back soon or reach out to the team.
            </p>
          </CardContent>
        </Card>
      ) : (
        groups.map((g) => (
          <section key={g.type} className="space-y-3">
            <h2 className="font-heading text-xl font-semibold">{CYCLE_TYPE_LABELS[g.type]}</h2>
            {g.cycles.map((c) => (
              <Card key={c.id}>
                <CardHeader>
                  <CardTitle>{c.name}</CardTitle>
                  {c.description ? <CardDescription className="whitespace-pre-line">{c.description}</CardDescription> : null}
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <CycleStatusPill cycle={c} compact />
                    <span>{closesLabel(c.closesAt)}</span>
                  </div>
                  <Button asChild>
                    <Link href={`/apply/${encodeURIComponent(c.slug)}`}>Apply</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
