import Link from "next/link";
import { notFound } from "next/navigation";
import { Editable } from "@/components/cms/editable";
import { PrintButton } from "@/components/public/print-button";
import { Container, ManageLink } from "@/components/public/section";
import { Markdown } from "@/components/shared/markdown";
import { canEditContent } from "@/lib/cms/content";
import { academicYearLabel, fmtDate } from "@/lib/dates";
import { getLiveReportMetrics, getPublishedReport, type ReportMetrics } from "@/lib/public/queries";

export async function generateMetadata(props: PageProps<"/reports/[year]">) {
  const report = await getPublishedReport(Number((await props.params).year));
  return report ? { title: report.title, description: report.summary ?? undefined } : { title: "Report not found" };
}

/** A published annual report as a plain article. Unpublished or missing years are a 404. */
export default async function ReportPage(props: PageProps<"/reports/[year]">) {
  const { year: yearParam } = await props.params;
  const year = Number(yearParam);
  const [report, canEdit] = await Promise.all([getPublishedReport(year), canEditContent()]);
  if (!report) notFound();

  // Prefer the numbers frozen at publish time; fall back to a live count.
  const metrics: ReportMetrics = report.metrics ?? (await getLiveReportMetrics(year));
  const metricRows = [
    { n: metrics.formalSessions, labelKey: "report.metrics.formal" },
    { n: metrics.informalSessions, labelKey: "report.metrics.informal" },
    { n: metrics.participants, labelKey: "report.metrics.participants" },
    { n: metrics.hours, labelKey: "report.metrics.hours" },
    { n: metrics.volunteers, labelKey: "report.metrics.volunteers" },
  ].filter((m): m is { n: number; labelKey: string } => typeof m.n === "number");

  return (
    <article className="py-12 md:py-16">
      <Container className="max-w-3xl">
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href="/reports" className="text-muted-foreground hover:text-foreground hover:underline underline-offset-4">
            {"← "}
            <Editable k="report.back" as="span" />
          </Link>
          <ManageLink href={`/reports-admin/${report.year}`} canEdit={canEdit} />
        </div>

        <header className="mt-6">
          <p className="text-sm text-muted-foreground">
            Annual report · {academicYearLabel(report.year)}
            {report.publishedAt ? ` · published ${fmtDate(report.publishedAt, "MMMM d, yyyy")}` : ""}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight md:text-4xl text-balance">{report.title}</h1>
          {report.summary ? <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{report.summary}</p> : null}
          <div className="mt-6">
            <PrintButton>
              <Editable k="report.print" as="span" />
            </PrintButton>
          </div>
        </header>

        {/* The year's numbers */}
        {metricRows.length > 0 ? (
          <section className="mt-12" aria-labelledby="metrics-title">
            <Editable k="report.metrics.heading" as="h2" className="font-heading text-2xl font-semibold" />
            {!report.metrics ? <Editable k="report.metrics.liveNote" as="p" className="mt-1 text-sm text-muted-foreground" /> : null}
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {metricRows.map((m) => (
                <div key={m.labelKey} className="rounded-lg border p-4">
                  <dd className="font-heading text-3xl font-semibold tabular-nums">{m.n.toLocaleString("en-US")}</dd>
                  <Editable k={m.labelKey} as="dt" className="mt-1 text-sm text-muted-foreground" />
                </div>
              ))}
            </dl>
            {metrics.topics && metrics.topics.length > 0 ? (
              <p className="mt-4 leading-relaxed">
                <Editable k="report.topics.label" as="span" className="font-semibold" />
                {": "}
                {metrics.topics.join(", ")}.
              </p>
            ) : null}
          </section>
        ) : null}

        {/* Highlights */}
        {report.highlights.length > 0 ? (
          <section className="mt-12" aria-labelledby="highlights-title">
            <Editable k="report.highlights.heading" as="h2" className="font-heading text-2xl font-semibold" />
            <ul className="mt-4 list-disc space-y-2 pl-6 leading-relaxed">
              {report.highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Narrative (markdown written by the leadership team) */}
        {report.narrative ? (
          <section className="mt-12" aria-label="Report narrative">
            <Markdown source={report.narrative} className="leading-relaxed" />
          </section>
        ) : null}

        {/* Quotes */}
        {report.quotes.length > 0 ? (
          <section className="mt-12" aria-labelledby="quotes-title">
            <Editable k="report.quotes.heading" as="h2" className="font-heading text-2xl font-semibold" />
            <div className="mt-4 space-y-6">
              {report.quotes.map((q, i) => (
                <figure key={i} className="border-l-4 border-primary pl-4">
                  <blockquote className="text-lg leading-relaxed">{q.text}</blockquote>
                  {q.attribution ? <figcaption className="mt-2 text-sm text-muted-foreground">— {q.attribution}</figcaption> : null}
                </figure>
              ))}
            </div>
          </section>
        ) : null}
      </Container>
    </article>
  );
}
