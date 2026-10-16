import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicCycleBySlug } from "@/lib/recruitment/queries";
import { CYCLE_TYPE_LABELS } from "@/lib/constants";
import { cycleStatus, deadlineSentence, formRenderedAt } from "@/lib/recruitment/helpers";
import { fmtDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApplyForm } from "@/components/recruitment/apply-form";

export async function generateMetadata(props: PageProps<"/apply/[slug]">) {
  const { slug } = await props.params;
  const cycle = await getPublicCycleBySlug(slug);
  return { title: cycle ? `Apply — ${cycle.name}` : "Apply" };
}

/**
 * The public application page for one cycle. Shows the form while the cycle
 * is open (decided by `cycleStatus`, the same helper the submit action uses)
 * and a friendly closed notice otherwise. Unknown slugs are a 404.
 */
export default async function ApplyCyclePage(props: PageProps<"/apply/[slug]">) {
  const { slug } = await props.params;
  const cycle = await getPublicCycleBySlug(slug);
  if (!cycle) notFound();
  const status = cycleStatus(cycle);
  const typeLabel = CYCLE_TYPE_LABELS[cycle.type as keyof typeof CYCLE_TYPE_LABELS] ?? cycle.type;

  if (status.kind !== "OPEN") {
    return (
      <Card>
        <CardContent className="space-y-4 py-8">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{typeLabel} application</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{cycle.name}</h1>
          {status.kind === "SCHEDULED" ? (
            <p className="text-muted-foreground">
              Applications are not open yet. They open on <strong>{fmtDate(status.opensAt)}</strong> — check back then.
            </p>
          ) : status.kind === "DEADLINE_PASSED" ? (
            <p className="text-muted-foreground">
              Applications for this round closed on <strong>{fmtDate(status.closesAt)}</strong>. Thank you for your interest.
            </p>
          ) : (
            <p className="text-muted-foreground">Applications for this round are closed. Thank you for your interest.</p>
          )}
          <p className="text-sm text-muted-foreground">
            Missed it? Volunteer applications usually open each February. Other rounds may be open now.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild>
              <Link href="/apply">See open applications</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Back to the CCHP website</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderedAt = formRenderedAt();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{typeLabel} application</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{cycle.name}</h1>
        {cycle.description ? <p className="mt-2 whitespace-pre-line text-muted-foreground">{cycle.description}</p> : null}
        <p className="mt-2 text-xs text-muted-foreground">
          {status.closesAt ? `${deadlineSentence(status.closesAt)} ` : ""}
          Your answers are reviewed anonymously — reviewers see your writing before they see your name.{" "}
          <Link href="/apply" className="underline underline-offset-2">
            See other open applications
          </Link>
          .
        </p>
      </div>
      {/* renderedAt feeds the minimum-time anti-spam check in the server action. */}
      <ApplyForm cycle={cycle} renderedAt={renderedAt} />
    </div>
  );
}
