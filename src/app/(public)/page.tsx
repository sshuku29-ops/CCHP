import Link from "next/link";
import { Brochure } from "@/components/public/brochure";
import { Portrait, ScallopEdge, Stripe } from "@/components/public/stationery";
import { fmtDate } from "@/lib/dates";
import { getLeadershipProfiles, getPartners, getPublicStats, getSiteSettings } from "@/lib/public/queries";

export const metadata = {
  title: "CCHP — Colby Community Health Program",
  description: "Free health and wellness education at the Mid-Maine Homeless Shelter in Waterville, Maine, run by Colby College student volunteers.",
};

/** The 3-week cycle every formal session goes through. Real steps, in order. */
const CYCLE = [
  { when: "Three weeks before", what: "Research and an outline", detail: "Five volunteers pick the topic with the Formal Sessions Director, read reliable sources, and write a one-page outline: key points, discussion questions, an activity, and Jeopardy questions." },
  { when: "Two weeks before", what: "Feedback from leadership", detail: "Leaders read the outline and send it back with notes. Plain language wins over polish; anything a doctor would say gets translated." },
  { when: "Ten days before", what: "Two decks", detail: "One slide deck for the session and one that becomes the brochure. The brochure is what people take back to their room." },
  { when: "One week before", what: "A recorded practice run", detail: "The group records a run-through as an unlisted video. Leadership watches it and sends last notes." },
  { when: "Session day", what: "Live at the shelter", detail: "An hour at the Mid-Maine Homeless Shelter: a short talk, a real conversation, an activity, a round of Jeopardy, and brochures handed out." },
  { when: "Afterwards", what: "Feedback and the record", detail: "Participants fill in a short Qualtrics survey. The session, its topic and its numbers go into our records, which feed the pages on this site." },
];

export default async function HomePage() {
  const [settings, stats, leaders, partners] = await Promise.all([getSiteSettings(), getPublicStats(), getLeadershipProfiles(6), getPartners()]);

  const figures = [
    { n: stats.formalSessions, caption: "formal sessions led at the shelter" },
    { n: stats.distinctTopics, caption: "health topics taught, each with its own brochure" },
    { n: stats.participants, caption: "times a community member joined a session" },
    { n: stats.informalSessions, caption: "informal sessions: games, coffee, company" },
    { n: stats.volunteerHours, caption: "volunteer hours, counted together and never ranked" },
  ];

  return (
    <>
      {/* ───────── Hero: the brochure beside the card ───────── */}
      <section className="mx-auto max-w-7xl px-3 pt-3 pb-3 grid gap-3 md:grid-cols-2" aria-labelledby="hero-title">
        {/* On a phone the brochure comes first; on desktop it sits on the right and stays in view. */}
        <div className="order-1 md:order-2 pub-ground md:sticky md:top-3 md:self-start md:h-[calc(100svh-1.5rem)] flex items-center justify-center px-5 py-10 md:py-12">
          <Brochure nextSession={stats.nextSession} />
        </div>
        <div className="order-2 md:order-1 pub-paper -mt-8 md:mt-0 relative flex flex-col">
          <Stripe id="hero-stripe" height={48} />
          <div className="px-6 py-10 md:px-12 md:py-16 flex-1 flex flex-col items-center text-center">
            <p className="font-heading font-semibold tracking-tight text-[clamp(3.5rem,8vw,6rem)] leading-none">CCHP</p>
            <p className="pub-small pub-ink-soft mt-2">Colby Community Health Program</p>
            <h1 id="hero-title" className="font-heading font-medium leading-[1.08] mt-10 text-[clamp(1.9rem,3.1vw,2.8rem)] max-w-[22ch] text-balance">
              {settings.tagline || "Health education, one conversation at a time."}
            </h1>
            <p className="pub-body mt-6 max-w-[38ch]">{settings.hero_note}</p>
            <Link href="/apply" className="pub-btn mt-8">
              Apply to volunteer
            </Link>
            <ul className="mt-auto pt-14 flex flex-wrap justify-center gap-x-7 gap-y-2 pub-small">
              <li>
                <Link href="/team" className="pub-link">
                  Meet the team
                </Link>
              </li>
              <li>
                <Link href="/impact" className="pub-link">
                  See the numbers
                </Link>
              </li>
              <li>
                <Link href="/reports" className="pub-link">
                  Read the reports
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ───────── About: title, note, facts row ───────── */}
      <section id="about" className="pub-paper-2 scroll-mt-4" aria-labelledby="about-title">
        <div className="mx-auto max-w-6xl px-[var(--pub-margin)] pt-24 pb-24 md:pt-36 md:pb-32">
          <div className="grid gap-8 md:grid-cols-12 md:items-end">
            <h2 id="about-title" className="pub-display md:col-span-6">
              What CCHP does
            </h2>
            <p className="pub-body md:col-span-4 md:col-start-9 max-w-[32ch]">{settings.mission}</p>
          </div>
          <p className="pub-lead mt-14 md:mt-20 max-w-[58ch]">
            A formal session is an hour at the shelter: a short talk, a real conversation, an activity, a round of Jeopardy, and a brochure to keep.
            Informal sessions are games and hangouts with residents. No slides, just time together.
          </p>
          <dl className="mt-16 md:mt-24 grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
            <Fact n="3" label="formal sessions a semester, each on one health topic" />
            <Fact n="5" label="volunteers plan and run each session" />
            <Fact n="3 weeks" label="of preparation before every session" />
            <Fact n="About 15" label="Colby student volunteers at any one time" />
          </dl>
        </div>
      </section>

      {/* ───────── Stats: a ledger column ───────── */}
      <section className="pub-paper" aria-labelledby="stats-title">
        <div className="mx-auto max-w-6xl px-[var(--pub-margin)] pt-24 pb-24 md:pt-36 md:pb-32 grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5 md:sticky md:top-8 md:self-start">
            <h2 id="stats-title" className="pub-title">
              <span className="block pub-ink-soft">So far,</span>
              <span className="block">by the numbers.</span>
            </h2>
            <p className="pub-body mt-6 max-w-[36ch]">
              Live from our session records and hours log. Only sessions that have already happened are counted.
            </p>
            {stats.nextSession ? (
              <p className="pub-body mt-6 max-w-[36ch]">
                The next session is on <strong>{fmtDate(stats.nextSession.date, "EEEE, MMMM d")}</strong>
                {stats.nextSession.topic ? <>: {stats.nextSession.topic}.</> : "."}
              </p>
            ) : null}
            <Link href="/impact" className="pub-link pub-green-ink inline-block mt-8 pub-body">
              Year by year
            </Link>
          </div>
          <dl className="md:col-span-7 md:col-start-6">
            {figures.map((f) => (
              <div key={f.caption} className="grid grid-cols-[minmax(3ch,auto)_1fr] gap-x-6 items-baseline py-3">
                <dd className="pub-figure text-right order-1">{f.n.toLocaleString("en-US")}</dd>
                <dt className="pub-body max-w-[26ch] order-2">{f.caption}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ───────── How a session happens: a row of papers on the table ───────── */}
      <section className="pub-ground overflow-hidden" aria-labelledby="cycle-title">
        <div className="mx-auto max-w-6xl px-[var(--pub-margin)] pt-24 md:pt-32">
          <h2 id="cycle-title" className="pub-title max-w-[14ch]">
            How a session happens
          </h2>
          <p className="pub-lead mt-6 max-w-[48ch]">
            Every formal session takes three weeks to make. Five volunteers follow the same steps, and the brochure is the last thing finished.
          </p>
          <p className="pub-small mt-3 opacity-90">Scroll sideways to follow the three weeks.</p>
        </div>
        <ol className="pub-row mt-10 pb-24 md:pb-32 list-none">
          {CYCLE.map((step) => (
            <li key={step.when} className="pub-paper px-6 py-7">
              <p className="pub-body font-semibold">{step.when}</p>
              <p className="font-heading font-medium text-[1.6rem] leading-tight mt-2 text-balance">{step.what}</p>
              <p className="pub-small pub-ink-soft mt-5">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────── Leadership preview ───────── */}
      {leaders.length > 0 ? (
        <section className="pub-paper-2" aria-labelledby="team-title">
          <div className="mx-auto max-w-6xl px-[var(--pub-margin)] pt-24 pb-24 md:pt-36 md:pb-32">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 id="team-title" className="pub-title max-w-[14ch]">
                The students behind it
              </h2>
              <Link href="/team" className="pub-link pub-green-ink pub-body">
                Meet the whole team
              </Link>
            </div>
            <ul className="mt-14 grid gap-x-8 gap-y-12 grid-cols-2 md:grid-cols-3">
              {leaders.map((p) => (
                <li key={p.id}>
                  <Portrait firstName={p.firstName} lastName={p.lastName} photoUrl={p.photoUrl} size={88} />
                  <p className="pub-body font-semibold mt-4">
                    {p.firstName} {p.lastName}
                  </p>
                  {p.leadershipTitle ? <p className="pub-small pub-ink-soft mt-1">{p.leadershipTitle}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ───────── Partners: the printed sheet ───────── */}
      <section className="pub-ground" aria-labelledby="partners-title">
        <div className="mx-auto max-w-2xl px-[var(--pub-margin)] md:px-0 pt-24 pb-24 md:pt-36 md:pb-32">
          <ScallopEdge id="partners-top" />
          <div className="pub-paper px-6 py-12 md:px-16 md:py-16 text-center">
            <h2 id="partners-title" className="pub-title">
              Who we work with
            </h2>
            <p className="pub-small pub-ink-soft mt-3">CCHP is a student program. These organizations make the sessions possible.</p>
            <ul className="mt-12 space-y-10">
              {partners.map((p) => (
                <li key={p.id}>
                  <p className="font-heading font-medium text-[1.4rem] leading-tight">
                    {p.url ? (
                      <a href={p.url} className="pub-link" rel="noopener noreferrer" target="_blank">
                        {p.name}
                      </a>
                    ) : (
                      p.name
                    )}
                  </p>
                  {p.description ? <p className="pub-body mt-2 max-w-[44ch] mx-auto">{p.description}</p> : null}
                </li>
              ))}
            </ul>
            <p className="pub-small pub-ink-soft mt-12">
              <Link href="/partners" className="pub-link">
                More about our partners
              </Link>
            </p>
          </div>
          <ScallopEdge id="partners-bottom" flip />
        </div>
      </section>

      {/* ───────── Call to action: the reply card ───────── */}
      <section className="pub-ground overflow-hidden" aria-labelledby="cta-title">
        <div className="mx-auto max-w-6xl px-[var(--pub-margin)] pt-16 md:pt-28 grid gap-12 md:grid-cols-12 md:items-end">
          <p className="pub-lead md:col-span-4 md:pb-16 max-w-[30ch]">
            Applications for new volunteers, leadership roles, and faculty or community partners all go through one form.
          </p>
          <div className="md:col-span-6 md:col-start-7 pub-tilt pub-paper px-8 py-10 md:px-12 md:py-14 text-center -mb-10 md:-mb-16">
            <h2 id="cta-title" className="pub-title">
              Join the next cycle
            </h2>
            <p className="pub-body mt-4 max-w-[36ch] mx-auto">A few written answers and a short video link. No account needed; we follow up by email.</p>
            <Link href="/apply" className="pub-btn w-full mt-8 min-h-[3.5rem]">
              Apply to volunteer
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/** One fact in the facts row: a large figure and a one-line explanation under it. */
function Fact({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="font-heading font-medium text-[clamp(1.9rem,3vw,2.8rem)] leading-none">{n}</dd>
      <dd aria-hidden="true" className="pub-small pub-ink-soft mt-3 max-w-[24ch]">
        {label}
      </dd>
    </div>
  );
}
