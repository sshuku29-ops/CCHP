import Link from "next/link";
import { Editable } from "@/components/cms/editable";
import { ManageLink, PageTitle, Section } from "@/components/public/section";
import { canEditContent } from "@/lib/cms/content";
import { academicYearLabel, fmtDate } from "@/lib/dates";
import { getPublishedReports } from "@/lib/public/queries";

export const metadata = {
  title: "Annual reports",
  description: "CCHP's published annual reports: what we did each academic year, what we learned, and the numbers.",
};

export default async function ReportsPage() {
  const [reports, canEdit] = await Promise.all([getPublishedReports(), canEditContent()]);

  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle titleKey="reports.heading" introKey="reports.intro" />
        <ManageLink href="/reports-admin" canEdit={canEdit} />
      </div>

      {reports.length === 0 ? (
        <Editable k="reports.empty" as="p" className="mt-10 text-muted-foreground" />
      ) : (
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {reports.map((r) => (
            <li key={r.year} className="flex flex-col rounded-lg border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                {academicYearLabel(r.year)}
                {r.publishedAt ? ` · published ${fmtDate(r.publishedAt)}` : ""}
              </p>
              <h2 className="mt-1 font-heading text-xl font-semibold">
                <Link href={`/reports/${r.year}`} className="hover:underline underline-offset-4">
                  {r.title}
                </Link>
              </h2>
              {r.summary ? <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.summary}</p> : null}
              <Link href={`/reports/${r.year}`} className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline">
                <Editable k="reports.read" as="span" />
                {" →"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
