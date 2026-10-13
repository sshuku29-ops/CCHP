import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/shared/markdown";
import { PrintButton } from "@/components/public/print-button";
import { ScallopEdge, Stripe } from "@/components/public/stationery";
import { academicYearLabel, fmtDate } from "@/lib/dates";
import { getLiveMetricsForYear, getPublishedReport, type ReportMetrics } from "@/lib/public/queries";

export async function generateMetadata(props: PageProps<"/reports/[year]">) {
  const report = await getPublishedReport(Number((await props.params).year));
  return report ? { title: report.title, description: report.summary ?? undefined } : { title: "Report not found" };
}

/** A published annual report. Unpublished or missing years are a 404. */
export default async function ReportPage(props: PageProps<"/reports/[year]">) {
  const { year: yearParam } = await props.params;
  const year = Number(yearParam);
  const report = await getPublishedReport(year);
  if (!report) notFound();

  // Prefer the numbers frozen at publish time; fall back to a live count.
  const metrics: ReportMetrics = report.metrics ?? (await getLiveMetricsForYear(year));
  const metricRows = [
    { n: metrics.formalSessions, caption: "formal sessions" },
    { n: metrics.informalSessions, caption: "informal sessions" },
    { n: metrics.participants, caption: "times a community member joined" },
    { n: metrics.hours, caption: "volunteer hours" },
    { n: metrics.volunteers, caption: "active volunteers" },
  ].filter((m): m is { n: number; caption: string } => typeof m.n === "number");

  return (
    <article className="pub-ground">
      <div className="mx-auto max-w-4xl px-[var(--pub-margin)] md:px-0 pt-6 pb-24 md:pt-10 md:pb-32 pub-print-sheet">
        <div className="pub-paper">
          <Stripe id="report-stripe" height={32} className="no-print" />
          <div className="px-6 py-12 md:px-16 md:py-16">
            <p className="pub-small pub-ink-soft no-print">
              <Link href="/reports" className="pub-link">
                All reports
              </Link>
            </p>
            <p className="pub-body pub-ink-soft mt-6">
              Annual report, {academicYearLabel(report.year)}
              {report.publishedAt ? ` · published ${fmtDate(report.publishedAt, "MMMM d, yyyy")}` : ""}
            </p>
            <h1 className="pub-display mt-3 max-w-[18ch] text-balance">{report.title}</h1>
            {report.summary ? <p className="pub-lead mt-8 max-w-[56ch]">{report.summary}</p> : null}
            <div className="mt-8">
              <PrintButton href={`/reports/${report.year}`} />
            </div>

            {/* The year's numbers */}
            {metricRows.length > 0 ? (
              <section className="mt-16" aria-labelledby="metrics-title">
                <h2 id="metrics-title" className="pub-title">
                  The year in numbers
                </h2>
                {!report.metrics ? <p className="pub-small pub-ink-soft mt-2">Counted live from the records for this year.</p> : null}
                <dl className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                  {metricRows.map((m) => (
                    <div key={m.caption} className="grid grid-cols-[minmax(3ch,auto)_1fr] gap-x-4 items-baseline">
                      <dd className="font-heading font-medium leading-none text-[clamp(2.5rem,4.5vw,4rem)] text-right order-1" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {m.n.toLocaleString("en-US")}
                      </dd>
                      <dt className="pub-body order-2 max-w-[18ch]">{m.caption}</dt>
                    </div>
                  ))}
                </dl>
                {metrics.topics && metrics.topics.length > 0 ? (
                  <p className="pub-body mt-8 max-w-[60ch]">
                    <span className="font-semibold">Topics taught: </span>
                    {metrics.topics.join(", ")}.
                  </p>
                ) : null}
              </section>
            ) : null}

            {/* Highlights */}
            {report.highlights.length > 0 ? (
              <section className="mt-16" aria-labelledby="highlights-title">
                <h2 id="highlights-title" className="pub-title">
                  Highlights
                </h2>
                <ul className="mt-8 space-y-4 max-w-[60ch]">
                  {report.highlights.map((h, i) => (
                    <li key={i} className="pub-lead pub-paper-2 px-5 py-4">
                      {h}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Narrative (markdown written by the leadership team) */}
            {report.narrative ? (
              <section className="mt-16 max-w-[66ch]" aria-label="Report narrative">
                <Markdown source={report.narrative} className="pub-body" />
              </section>
            ) : null}

            {/* Quotes as pull quotes */}
            {report.quotes.length > 0 ? (
              <section className="mt-16" aria-labelledby="quotes-title">
                <h2 id="quotes-title" className="sr-only">
                  What people said
                </h2>
                <div className="space-y-10">
                  {report.quotes.map((q, i) => (
                    <figure key={i} className="max-w-[40ch]">
                      <blockquote className="font-heading font-medium text-[clamp(1.4rem,2.4vw,2rem)] leading-snug text-balance">
                        <span className="pub-mark">{q.text}</span>
                      </blockquote>
                      {q.attribution ? <figcaption className="pub-body pub-ink-soft mt-4">{q.attribution}</figcaption> : null}
                    </figure>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
        <ScallopEdge id="report-bottom" flip />
      </div>
    </article>
  );
}
