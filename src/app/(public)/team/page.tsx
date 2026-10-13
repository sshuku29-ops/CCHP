import { PageSheet, Portrait, ScallopEdge } from "@/components/public/stationery";
import { getLeadershipProfiles, getOptInVolunteers } from "@/lib/public/queries";

export const metadata = {
  title: "Team",
  description: "The Colby students who lead and volunteer with CCHP.",
};

export default async function TeamPage() {
  const [leaders, volunteers] = await Promise.all([getLeadershipProfiles(), getOptInVolunteers()]);

  return (
    <>
      <PageSheet
        id="team"
        title="The students behind CCHP"
        intro="Leadership changes every year or two. These are the people running the program now, in the order the roles hand off to each other."
      >
        {leaders.length === 0 ? (
          <p className="pub-body mt-12 pub-ink-soft">No leadership profiles are published yet. Check back soon.</p>
        ) : (
          <ul className="mt-16 grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {leaders.map((p) => (
              <li key={p.id} className="max-w-[40ch]">
                <Portrait firstName={p.firstName} lastName={p.lastName} photoUrl={p.photoUrl} size={112} />
                <h2 className="font-heading font-medium text-[1.5rem] leading-tight mt-5">
                  {p.firstName} {p.lastName}
                </h2>
                {p.leadershipTitle ? <p className="pub-body pub-green-ink font-semibold mt-1">{p.leadershipTitle}</p> : null}
                {p.bio ? <p className="pub-body mt-4">{p.bio}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </PageSheet>

      {/* The volunteer list: a sheet of names, alphabetical, never ranked. */}
      <section className="pub-ground" aria-labelledby="volunteers-title">
        <div className="mx-auto max-w-3xl px-[var(--pub-margin)] md:px-0 pt-20 pb-24 md:pt-28 md:pb-32">
          <ScallopEdge id="vol-top" tone="paper-2" />
          <div className="pub-paper-2 px-6 py-12 md:px-14 md:py-16">
            <h2 id="volunteers-title" className="pub-title max-w-[16ch]">
              Volunteers who chose to be listed
            </h2>
            <p className="pub-body mt-5 max-w-[52ch]">
              Every volunteer logs their own hours. The names here belong to volunteers who opted in to being listed publicly. The list is
              alphabetical, not ranked: CCHP counts progress as a team.
            </p>
            {volunteers.length === 0 ? (
              <p className="pub-body pub-ink-soft mt-10">No volunteers have opted in to be listed yet.</p>
            ) : (
              <ul className="mt-10 grid gap-x-10 gap-y-3 sm:grid-cols-2 pub-body" style={{ fontVariantNumeric: "tabular-nums" }}>
                {volunteers.map((v) => (
                  <li key={v.id} className="flex justify-between gap-4">
                    <span>
                      {v.firstName} {v.lastName}
                    </span>
                    <span className="pub-ink-soft whitespace-nowrap">{formatHours(v.hours)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ScallopEdge id="vol-bottom" tone="paper-2" flip />
        </div>
      </section>
    </>
  );
}

function formatHours(h: number) {
  const n = Number.isInteger(h) ? h.toString() : h.toFixed(1);
  return `${n} ${h === 1 ? "hour" : "hours"}`;
}
