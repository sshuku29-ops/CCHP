import Link from "next/link";
import { notFound } from "next/navigation";
import { getOpenCycleBySlug } from "@/lib/recruitment/queries";
import { CYCLE_TYPE_LABELS } from "@/lib/constants";
import { formRenderedAt } from "@/lib/recruitment/helpers";
import { fmtDate } from "@/lib/dates";
import { ApplyForm } from "@/components/recruitment/apply-form";

export async function generateMetadata(props: PageProps<"/apply/[slug]">) {
  const { slug } = await props.params;
  const cycle = await getOpenCycleBySlug(slug);
  return { title: cycle ? `Apply — ${cycle.name}` : "Apply" };
}

/** The public application form for one open cycle. */
export default async function ApplyCyclePage(props: PageProps<"/apply/[slug]">) {
  const { slug } = await props.params;
  const cycle = await getOpenCycleBySlug(slug);
  if (!cycle) notFound();
  const renderedAt = formRenderedAt();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {CYCLE_TYPE_LABELS[cycle.type as keyof typeof CYCLE_TYPE_LABELS] ?? cycle.type} application
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{cycle.name}</h1>
        {cycle.description ? <p className="mt-2 whitespace-pre-line text-muted-foreground">{cycle.description}</p> : null}
        <p className="mt-2 text-xs text-muted-foreground">
          {cycle.closesAt ? `Applications close ${fmtDate(cycle.closesAt)}. ` : ""}
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
