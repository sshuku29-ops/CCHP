import { Editable } from "@/components/cms/editable";
import { PageTitle, Section, SectionHeading } from "@/components/public/section";
import { StatTile } from "@/components/public/stat-tile";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canEditContent } from "@/lib/cms/content";
import { academicYearLabel, fmtDate } from "@/lib/dates";
import { DocumentViewer } from "@/components/shared/document-viewer";
import { getFormalTopics, getPublicBrochures, getPublicPoster, getPublicStats, getPublicYearMetrics, getUpcomingSessions } from "@/lib/public/queries";

export const metadata = {
  title: "Impact",
  description: "CCHP sessions, topics, participants and volunteer hours, year by year.",
};

export default async function ImpactPage() {
  const [stats, years, topics, upcoming, brochures, poster, canEdit] = await Promise.all([
    getPublicStats(),
    getPublicYearMetrics(),
    getFormalTopics(),
    getUpcomingSessions(),
    getPublicBrochures(),
    getPublicPoster(),
    canEditContent(),
  ]);

  return (
    <>
      <Section className="pb-4 md:pb-6">
        <PageTitle titleKey="impact.heading" introKey="impact.intro" />
      </Section>

      {/* Headline numbers */}
      <Section ariaLabelledBy="glance-title">
        <SectionHeading headingKey="impact.stats.heading" id="glance-title" manageHref="/sessions" canEdit={canEdit} />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatTile value={stats.formalSessions} labelKey="home.stats.formal" />
          <StatTile value={stats.distinctTopics} labelKey="home.stats.topics" />
          <StatTile value={stats.participants} labelKey="home.stats.participants" />
          <StatTile value={stats.informalSessions} labelKey="home.stats.informal" />
          <StatTile value={stats.volunteerHours} labelKey="home.stats.hours" />
        </div>
        <Editable k="impact.survey.note" as="p" className="mt-6 max-w-3xl text-sm text-muted-foreground leading-relaxed" multiline />
      </Section>

      {/* Per-year table */}
      <Section className="border-t" ariaLabelledBy="years-title">
        <SectionHeading headingKey="impact.years.heading" introKey="impact.years.intro" id="years-title" />
        {years.length === 0 ? (
          <Editable k="impact.years.empty" as="p" className="text-muted-foreground" />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Academic year</TableHead>
                  <TableHead className="text-right">Formal sessions</TableHead>
                  <TableHead className="text-right">Informal sessions</TableHead>
                  <TableHead className="text-right">Participant visits</TableHead>
                  <TableHead className="text-right">Volunteer hours</TableHead>
                  <TableHead className="text-right">Active volunteers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {years.map((y) => (
                  <TableRow key={y.year}>
                    <TableCell className="font-medium">{academicYearLabel(y.year)}</TableCell>
                    <TableCell className="text-right tabular-nums">{y.formalSessions}</TableCell>
                    <TableCell className="text-right tabular-nums">{y.informalSessions}</TableCell>
                    <TableCell className="text-right tabular-nums">{y.totalParticipants.toLocaleString("en-US")}</TableCell>
                    <TableCell className="text-right tabular-nums">{Math.round(y.totalVolunteerHours).toLocaleString("en-US")}</TableCell>
                    <TableCell className="text-right tabular-nums">{y.activeVolunteers}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      {/* Topics */}
      <Section className="border-t" ariaLabelledBy="topics-title">
        <SectionHeading headingKey="impact.topics.heading" introKey="impact.topics.intro" id="topics-title" />
        {topics.length === 0 ? (
          <Editable k="impact.topics.empty" as="p" className="text-muted-foreground" />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t) => (
              <li key={t.topic} className="rounded-md border bg-card px-4 py-3">
                <p className="font-medium">{t.topic}</p>
                <p className="text-sm text-muted-foreground">
                  {t.timesTaught === 1 ? "Taught once" : `Taught ${t.timesTaught} times`} · last {fmtDate(t.lastTaught)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Brochures & handouts: public BROCHURE PDFs uploaded on each session record */}
      <Section className="border-t" ariaLabelledBy="brochures-title">
        <SectionHeading headingKey="impact.brochures.heading" introKey="impact.brochures.intro" id="brochures-title" manageHref="/sessions" canEdit={canEdit} />
        {brochures.length === 0 ? (
          <Editable k="impact.brochures.empty" as="p" className="text-muted-foreground" />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {brochures.map((b) => (
              <li key={b.id} className="flex flex-col rounded-lg border bg-card p-4">
                <p className="font-medium leading-snug">{b.title}</p>
                {b.session ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {fmtDate(b.session.date)}
                    {b.session.topic && !b.title.includes(b.session.topic) ? ` · ${b.session.topic}` : ""}
                  </p>
                ) : null}
                <a
                  href={`/api/files/${b.fileKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  <Editable k="impact.brochures.open" as="span" />
                  {" ↗"}
                </a>
              </li>
            ))}
          </ul>
        )}
        {poster ? (
          <div className="mt-8 max-w-md">
            <Editable k="impact.poster.heading" as="h3" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground" />
            <DocumentViewer doc={poster} />
          </div>
        ) : null}
      </Section>

      {/* Upcoming sessions */}
      <Section className="border-t" ariaLabelledBy="upcoming-title">
        <SectionHeading headingKey="impact.upcoming.heading" introKey="impact.upcoming.intro" id="upcoming-title" manageHref="/sessions" canEdit={canEdit} />
        {upcoming.length === 0 ? (
          <Editable k="impact.upcoming.empty" as="p" className="text-muted-foreground" />
        ) : (
          <ul className="max-w-xl divide-y rounded-lg border">
            {upcoming.map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
                <span className="font-medium tabular-nums">{fmtDate(s.date, "EEEE, MMMM d, yyyy")}</span>
                <span className="text-sm text-muted-foreground">
                  {s.type === "FORMAL" ? "Formal session" : "Informal session"}
                  {s.topic ? ` · ${s.topic}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
