import Link from "next/link";
import { PageSheet } from "@/components/public/stationery";
import { academicYearLabel, fmtDate } from "@/lib/dates";
import { getPublishedReports } from "@/lib/public/queries";

export const metadata = {
  title: "Annual reports",
  description: "CCHP's published annual reports: the year's sessions, numbers, highlights and what we learned.",
};

export default async function ReportsPage() {
  const reports = await getPublishedReports();

  return (
    <PageSheet
      id="reports"
      title="Annual reports"
      intro="One report a year, written by the leadership team in May. Each one gathers the year's sessions, numbers, highlights and a few things we heard."
    >
      {reports.length === 0 ? (
        <p className="pub-body pub-ink-soft mt-12">No reports have been published yet. The first one arrives at the end of the academic year.</p>
      ) : (
        <ul className="mt-16 space-y-6 max-w-3xl">
          {reports.map((r) => (
            <li key={r.year} className="pub-paper-2 px-6 py-7 md:px-10 md:py-9">
              <p className="pub-small pub-ink-soft">
                {academicYearLabel(r.year)}
                {r.publishedAt ? ` · published ${fmtDate(r.publishedAt, "MMMM yyyy")}` : ""}
              </p>
              <h2 className="font-heading font-medium text-[clamp(1.5rem,2.4vw,2rem)] leading-tight mt-2">
                <Link href={`/reports/${r.year}`} className="pub-link">
                  {r.title}
                </Link>
              </h2>
              {r.summary ? <p className="pub-body mt-4 max-w-[60ch]">{r.summary}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </PageSheet>
  );
}
