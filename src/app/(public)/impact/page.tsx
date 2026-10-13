import Link from "next/link";
import { PageSheet, ScallopEdge } from "@/components/public/stationery";
import { academicYearLabel, fmtDate } from "@/lib/dates";
import { getFormalTopics, getPublicStats, getUpcomingSessions, getYearMetrics } from "@/lib/public/queries";

export const metadata = {
  title: "Impact",
  description: "CCHP sessions, topics, participants and volunteer hours, year by year.",
};

export default async function ImpactPage() {
  const [stats, years, topics, upcoming] = await Promise.all([getPublicStats(), getYearMetrics(), getFormalTopics(), getUpcomingSessions()]);

  return (
    <>
      <PageSheet
        id="impact"
        title="What the records say"
        intro="Every session is logged with its date, topic and headcount, and every volunteer logs their hours. These numbers are read straight from those records."
      >
        {/* The headline figures, as a ledger */}
        <dl className="mt-16 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          <Figure n={stats.formalSessions} caption="formal sessions led" />
          <Figure n={stats.distinctTopics} caption="health topics taught" />
          <Figure n={stats.participants} caption="times a community member joined" />
          <Figure n={stats.informalSessions} caption="informal sessions" />
          <Figure n={stats.volunteerHours} caption="volunteer hours, counted together" />
        </dl>
      </PageSheet>

      {/* Year by year table */}
      <section className="pub-paper-2" aria-labelledby="years-title">
        <div className="mx-auto max-w-6xl px-[var(--pub-margin)] pt-20 pb-20 md:pt-28 md:pb-28">
          <h2 id="years-title" className="pub-title max-w-[16ch]">
            Year by year
          </h2>
          <p className="pub-body mt-5 max-w-[52ch]">
            An academic year runs from the fall semester through the following summer. Active volunteers are the people who logged hours or
            worked a session that year.
          </p>
          {years.length === 0 ? (
            <p className="pub-body pub-ink-soft mt-10">No sessions have been recorded yet.</p>
          ) : (
            <div className="mt-10 overflow-x-auto">
              <table className="pub-table pub-body min-w-[640px]">
                <thead>
                  <tr>
                    <th scope="col">Academic year</th>
                    <th scope="col" className="num">
                      Formal sessions
                    </th>
                    <th scope="col" className="num">
                      Informal sessions
                    </th>
                    <th scope="col" className="num">
                      Participants
                    </th>
                    <th scope="col" className="num">
                      Volunteer hours
                    </th>
                    <th scope="col" className="num">
                      Active volunteers
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((y) => (
                    <tr key={y.year}>
                      <th scope="row" className="font-semibold">
                        {academicYearLabel(y.year)}
                      </th>
                      <td className="num">{y.formalSessions}</td>
                      <td className="num">{y.informalSessions}</td>
                      <td className="num">{y.participants.toLocaleString("en-US")}</td>
                      <td className="num">{y.hours.toLocaleString("en-US")}</td>
                      <td className="num">{y.activeVolunteers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Topics taught + upcoming dates, side by side */}
      <section className="pub-paper" aria-labelledby="topics-title">
        <div className="mx-auto max-w-6xl px-[var(--pub-margin)] pt-20 pb-20 md:pt-28 md:pb-28 grid gap-16 md:grid-cols-2">
          <div>
            <h2 id="topics-title" className="pub-title max-w-[14ch]">
              Topics taught
            </h2>
            <p className="pub-body mt-5 max-w-[44ch]">Each formal session covers one topic and ends with a brochure about it. Most recent first.</p>
            {topics.length === 0 ? (
              <p className="pub-body pub-ink-soft mt-10">No formal sessions have been recorded yet.</p>
            ) : (
              <ul className="mt-10 space-y-4">
                {topics.map((t) => (
                  <li key={t.topic} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <span className="font-heading font-medium text-[1.35rem] leading-tight">{t.topic}</span>
                    <span className="pub-small pub-ink-soft">
                      {fmtDate(t.lastTaught, "MMMM yyyy")}
                      {t.timesTaught > 1 ? `, taught ${t.timesTaught} times` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="pub-title max-w-[14ch]">Coming up</h2>
            <p className="pub-body mt-5 max-w-[44ch]">Sessions scheduled at the Mid-Maine Homeless Shelter. Dates can move; the shelter always has the latest.</p>
            {upcoming.length === 0 ? (
              <p className="pub-body pub-ink-soft mt-10">The next dates will be posted once the semester schedule is set.</p>
            ) : (
              <ul className="mt-10 space-y-4">
                {upcoming.map((s) => (
                  <li key={s.id} className="pub-body">
                    <span className="font-semibold">{fmtDate(s.date, "EEEE, MMMM d, yyyy")}</span>
                    <span className="pub-ink-soft">
                      {" "}
                      {s.topic ? s.topic : s.type === "INFORMAL" ? "Informal session" : "Formal session"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Feedback note: aggregates only, and there are none in the database */}
      <section className="pub-ground" aria-labelledby="feedback-title">
        <div className="mx-auto max-w-3xl px-[var(--pub-margin)] md:px-0 pt-20 pb-24 md:pt-28 md:pb-32">
          <ScallopEdge id="fb-top" />
          <div className="pub-paper px-6 py-12 md:px-14 md:py-16 text-center">
            <h2 id="feedback-title" className="pub-title">
              What participants tell us
            </h2>
            <p className="pub-body mt-5 max-w-[48ch] mx-auto">
              After each session, participants can fill in a short, anonymous Qualtrics survey. We never publish individual answers. The results
              are summarized, as totals only, in each year&apos;s annual report.
            </p>
            <p className="pub-body mt-6">
              <Link href="/reports" className="pub-link pub-green-ink">
                Read the annual reports
              </Link>
            </p>
          </div>
          <ScallopEdge id="fb-bottom" flip />
        </div>
      </section>
    </>
  );
}

function Figure({ n, caption }: { n: number; caption: string }) {
  return (
    <div className="grid grid-cols-[minmax(3ch,auto)_1fr] gap-x-5 items-baseline">
      <dd className="pub-figure text-right order-1">{n.toLocaleString("en-US")}</dd>
      <dt className="pub-body max-w-[20ch] order-2">{caption}</dt>
    </div>
  );
}
