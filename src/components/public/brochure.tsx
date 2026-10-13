import { fmtDate } from "@/lib/dates";

/**
 * The hero object: a tri-fold brochure drawn in HTML, the way CCHP's
 * handouts look on the table at the shelter. The cover is live: it shows the
 * next scheduled session's topic and date straight from the records, so the
 * page is a little different every time a session is added.
 */
export function Brochure({ nextSession }: { nextSession: { date: Date; topic: string | null } | null }) {
  const topic = nextSession?.topic?.trim() || "Health, in plain language";
  const when = nextSession ? fmtDate(nextSession.date, "EEEE, MMMM d") : "Dates announced each semester";

  return (
    <figure className="w-full max-w-[560px] mx-auto" aria-label="A CCHP brochure. The cover shows the next session.">
      <div className="grid grid-cols-[0.42fr_1fr_0.42fr] items-end gap-1.5">
        {/* Left flap, folded back a little */}
        <div className="pub-paper-2 px-3 py-4 pub-small" style={{ transform: "perspective(900px) rotateY(28deg)", transformOrigin: "right center" }}>
          <p className="font-semibold">What it is</p>
          <p className="mt-2 pub-ink-soft">The facts, said simply.</p>
          <p className="mt-6 font-semibold">What helps</p>
          <p className="mt-2 pub-ink-soft">Small things you can do this week.</p>
          <p className="mt-6 font-semibold">Where to go</p>
          <p className="mt-2 pub-ink-soft">Free local help nearby.</p>
        </div>

        {/* Cover panel */}
        <div className="pub-paper px-5 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-8 min-h-[360px] flex flex-col">
          <div className="flex items-center justify-between">
            <span className="font-heading text-2xl font-semibold tracking-tight">CCHP</span>
            <span className="pub-small pub-ink-soft">Free. Take one.</span>
          </div>
          <p className="pub-small mt-8 pub-ink-soft">{nextSession ? "Next session" : "Sessions"}</p>
          <p className="font-heading font-medium leading-[1.05] mt-1 text-[clamp(1.75rem,3vw,2.4rem)] text-balance">{topic}</p>
          <p className="pub-body mt-4">{when}</p>
          <p className="pub-small pub-ink-soft">Mid-Maine Homeless Shelter, Waterville</p>
          <div className="mt-auto pt-8">
            <p className="pub-mark inline pub-small font-semibold">Discussion, activities, Jeopardy, and this brochure to keep.</p>
          </div>
        </div>

        {/* Right flap */}
        <div className="pub-paper-2 px-3 py-4 pub-small" style={{ transform: "perspective(900px) rotateY(-28deg)", transformOrigin: "left center" }}>
          <p className="font-semibold">Ask us</p>
          <p className="mt-2 pub-ink-soft">Every session ends with questions and a conversation.</p>
          <p className="mt-6 font-semibold">Made by</p>
          <p className="mt-2 pub-ink-soft">Colby College student volunteers.</p>
        </div>
      </div>
      <figcaption className="sr-only">
        A folded brochure. The cover reads: {topic}. {when}. Mid-Maine Homeless Shelter, Waterville.
      </figcaption>
    </figure>
  );
}
