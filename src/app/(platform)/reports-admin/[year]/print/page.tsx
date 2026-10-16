import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth/guards";
import { HOURS_TYPE_LABELS, HOURS_TYPES } from "@/lib/constants";
import { academicYearLabel } from "@/lib/dates";
import { computeYearMetrics } from "@/lib/reports/metrics";
import { getReport } from "@/lib/reports/queries";
import { Markdown } from "@/components/shared/markdown";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/records/print-button";

export const metadata = { title: "Print report" };

/**
 * Clean, print-friendly version of the report. When printing, everything
 * outside #print-root (the app shell) is hidden and the report fills the page.
 * Uses the published snapshot when there is one, otherwise live metrics.
 */
export default async function ReportPrintPage(props: PageProps<"/reports-admin/[year]/print">) {
  await requireModule("reports");
  const { year: yearStr } = await props.params;
  if (!/^\d{4}$/.test(yearStr)) notFound();
  const year = Number(yearStr);
  const report = await getReport(year);
  if (!report) notFound();
  const metrics = report.snapshot ?? (await computeYearMetrics(year));

  const stats: [string, string | number][] = [
    ["Formal sessions", metrics.formalSessions],
    ["Informal sessions", metrics.informalSessions],
    ["Participants", metrics.totalParticipants],
    ["Volunteer hours", metrics.totalVolunteerHours],
    ["Active volunteers", metrics.activeVolunteers],
    ["Applications received", metrics.applicationsReceived],
  ];

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-root, #print-root * { visibility: visible; }
          #print-root { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          .no-print { display: none !important; }
          @page { margin: 2cm; }
        }
      `}</style>

      <div className="no-print mb-4 flex flex-wrap gap-2">
        <PrintButton />
        <Button asChild variant="outline">
          <Link href={`/reports-admin/${year}`}>Back to editor</Link>
        </Button>
        {!report.snapshot ? <p className="self-center text-xs text-muted-foreground">Showing live metrics (not published yet).</p> : null}
      </div>

      <article id="print-root" className="mx-auto max-w-3xl rounded-xl border bg-white p-8 text-black shadow-sm print:border-0 print:shadow-none">
        <header className="mb-8 border-b pb-6">
          <p className="text-sm uppercase tracking-wide text-neutral-500">Colby Community Health Program</p>
          <h1 className="font-heading mt-1 text-3xl font-semibold">{report.title}</h1>
          <p className="mt-1 text-neutral-600">Academic year {academicYearLabel(year)}</p>
          {report.summary ? <p className="mt-4 text-lg leading-relaxed">{report.summary}</p> : null}
        </header>

        <section className="mb-8">
          <h2 className="font-heading mb-3 text-xl font-semibold">By the numbers</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.map(([label, value]) => (
              <div key={label} className="rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
                <p className="font-heading text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 text-sm">
            <div>
              <p className="font-medium">Hours by type</p>
              <ul className="mt-1">
                {HOURS_TYPES.map((t) => (
                  <li key={t} className="flex justify-between border-b py-1">
                    <span>{HOURS_TYPE_LABELS[t]}</span>
                    <span>{metrics.hoursByType[t]}</span>
                  </li>
                ))}
              </ul>
            </div>
            {metrics.formalTopics.length ? (
              <div>
                <p className="font-medium">Formal session topics</p>
                <ul className="mt-1 list-disc pl-5">
                  {metrics.formalTopics.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>

        {report.highlightsList.length ? (
          <section className="mb-8">
            <h2 className="font-heading mb-3 text-xl font-semibold">Highlights</h2>
            <ul className="list-disc pl-5 space-y-1">
              {report.highlightsList.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {report.narrative ? (
          <section className="mb-8">
            <Markdown source={report.narrative} />
          </section>
        ) : null}

        {report.quotesList.length ? (
          <section className="mb-4">
            <h2 className="font-heading mb-3 text-xl font-semibold">In their words</h2>
            <div className="space-y-4">
              {report.quotesList.map((q, i) => (
                <blockquote key={i} className="border-l-4 border-neutral-300 pl-4 italic">
                  <p>“{q.text}”</p>
                  <footer className="mt-1 text-sm not-italic text-neutral-600">— {q.attribution}</footer>
                </blockquote>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </div>
  );
}
