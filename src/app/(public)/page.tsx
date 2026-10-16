import Link from "next/link";
import { Editable } from "@/components/cms/editable";
import { PartnerLogo } from "@/components/public/partner-logo";
import { PersonAvatar } from "@/components/public/person-avatar";
import { Container, ManageLink, Section, SectionHeading } from "@/components/public/section";
import { StatTile } from "@/components/public/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { canEditContent } from "@/lib/cms/content";
import { fmtDate } from "@/lib/dates";
import { getLeadershipProfiles, getLogo, getPartners, getPublicStats } from "@/lib/public/queries";

export const metadata = {
  title: "CCHP — Colby Community Health Program",
  description: "Free health and wellness education at the Mid-Maine Homeless Shelter in Waterville, Maine, run by Colby College student volunteers.",
};

/** The five steps of a formal session. Text for each lives in defaults.ts. */
const STEP_KEYS = ["home.how.step1", "home.how.step2", "home.how.step3", "home.how.step4", "home.how.step5"];

export default async function HomePage() {
  const [stats, leaders, partners, mmhsLogo, canEdit] = await Promise.all([
    getPublicStats(),
    getLeadershipProfiles(6),
    getPartners(),
    getLogo("Mid-Maine"),
    canEditContent(),
  ]);

  return (
    <>
      {/* Hero */}
      <Section className="pt-14 md:pt-20" ariaLabelledBy="hero-title">
        <div className="max-w-3xl">
          <Editable k="home.hero.eyebrow" as="p" className="text-sm font-medium text-primary" />
          <Editable k="home.hero.title" as="h1" className="mt-3 font-heading text-4xl font-semibold tracking-tight md:text-5xl text-balance" />
          <Editable k="home.hero.subtitle" as="p" className="mt-5 text-lg text-muted-foreground leading-relaxed" multiline />
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="px-5 text-base">
              <Link href="/apply">
                <Editable k="home.hero.cta" as="span" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-5 text-base">
              <Link href="/impact">
                <Editable k="home.hero.secondary" as="span" />
              </Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* What we do */}
      <Section id="about" className="border-t" ariaLabelledBy="what-title">
        <SectionHeading headingKey="home.what.heading" id="what-title" />
        <div className="max-w-3xl">
          <Editable k="home.mission.heading" as="h3" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground" />
          <Editable k="home.mission.body" as="p" className="mt-2 text-lg leading-relaxed" multiline />
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Card key={n}>
              <CardContent className="pt-5">
                <Editable k={`home.what.card${n}.title`} as="h3" className="font-heading text-xl font-semibold" />
                <Editable k={`home.what.card${n}.body`} as="p" className="mt-2 text-sm text-muted-foreground leading-relaxed" multiline />
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* How a session happens */}
      <Section className="border-t bg-muted/30" ariaLabelledBy="how-title">
        <SectionHeading headingKey="home.how.heading" introKey="home.how.intro" id="how-title" />
        <ol className="max-w-3xl space-y-4">
          {STEP_KEYS.map((k, i) => (
            <li key={k} className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
              >
                {i + 1}
              </span>
              <Editable k={k} as="p" className="pt-1 leading-relaxed" multiline />
            </li>
          ))}
        </ol>
      </Section>

      {/* Program stats */}
      <Section className="border-t" ariaLabelledBy="stats-title">
        <SectionHeading headingKey="home.stats.heading" introKey="home.stats.intro" id="stats-title" manageHref="/sessions" canEdit={canEdit} />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatTile value={stats.formalSessions} labelKey="home.stats.formal" />
          <StatTile value={stats.distinctTopics} labelKey="home.stats.topics" />
          <StatTile value={stats.participants} labelKey="home.stats.participants" />
          <StatTile value={stats.informalSessions} labelKey="home.stats.informal" />
          <StatTile value={stats.volunteerHours} labelKey="home.stats.hours" />
          <div className="rounded-lg border bg-card p-5">
            {stats.nextSession ? (
              <p className="font-heading text-2xl font-semibold md:text-3xl">{fmtDate(stats.nextSession.date)}</p>
            ) : (
              <Editable k="home.stats.nextNone" as="p" className="font-heading text-2xl font-semibold md:text-3xl" />
            )}
            <Editable k="home.stats.next" as="p" className="mt-1 text-sm text-muted-foreground" />
            {stats.nextSession?.topic ? <p className="mt-1 text-sm">{stats.nextSession.topic}</p> : null}
          </div>
        </div>
      </Section>

      {/* Where we work: the shelter, with the three numbers that matter most */}
      <Section className="border-t bg-muted/30" ariaLabelledBy="where-title">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-start">
          <div className="max-w-3xl">
            <Editable k="home.where.heading" as="h2" className="font-heading text-2xl font-semibold tracking-tight md:text-3xl" />
            <Editable k="home.where.body" as="p" className="mt-3 text-muted-foreground leading-relaxed" multiline />
            <dl className="mt-6 grid grid-cols-3 gap-4 max-w-md">
              {[
                { n: stats.formalSessions, k: "home.where.stat.sessions" },
                { n: stats.participants, k: "home.where.stat.visits" },
                { n: stats.volunteerHours, k: "home.where.stat.hours" },
              ].map((m) => (
                <div key={m.k}>
                  <dd className="font-heading text-2xl font-semibold tabular-nums md:text-3xl">{m.n.toLocaleString("en-US")}</dd>
                  <Editable k={m.k} as="dt" className="mt-0.5 text-sm text-muted-foreground" />
                </div>
              ))}
            </dl>
          </div>
          {mmhsLogo ? (
            <div className="rounded-lg border bg-card p-4 md:w-56">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/${mmhsLogo.fileKey}`} alt="Mid-Maine Homeless Shelter" className="mx-auto max-h-24 w-auto object-contain" loading="lazy" />
              <Editable k="home.where.caption" as="p" className="mt-3 text-center text-xs text-muted-foreground" />
            </div>
          ) : null}
        </div>
      </Section>

      {/* Leadership preview */}
      {leaders.length > 0 ? (
        <Section className="border-t" ariaLabelledBy="team-title">
          <SectionHeading headingKey="home.team.heading" introKey="home.team.intro" id="team-title" manageHref="/site-content?tab=leadership" canEdit={canEdit} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leaders.map((p) => (
              <li key={p.id}>
                <Link href={`/team/${p.id}`} className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
                  <PersonAvatar person={p} size="lg" />
                  <div className="min-w-0">
                    <p className="font-medium">
                      {p.firstName} {p.lastName}
                    </p>
                    {p.leadershipTitle ? <p className="text-sm text-muted-foreground">{p.leadershipTitle}</p> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/team" className="mt-6 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
            <Editable k="home.team.link" as="span" />
            {" →"}
          </Link>
        </Section>
      ) : null}

      {/* Partners */}
      {partners.length > 0 || canEdit ? (
        <Section className="border-t" ariaLabelledBy="partners-title">
          <SectionHeading headingKey="home.partners.heading" introKey="home.partners.intro" id="partners-title" manageHref="/site-content?tab=partners" canEdit={canEdit} />
          <ul className="grid gap-4 sm:grid-cols-3">
            {partners.map((p) => {
              const inner = (
                <>
                  {p.logoKey ? (
                    <div className="flex h-20 items-center justify-center">
                      <PartnerLogo logoKey={p.logoKey} name={p.name} />
                    </div>
                  ) : null}
                  <span className="mt-3 block text-sm font-medium">{p.name}</span>
                </>
              );
              return (
                <li key={p.id} className="rounded-lg border bg-card p-4 text-center">
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="block hover:underline underline-offset-4">
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
          <Link href="/partners" className="mt-6 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
            <Editable k="home.partners.link" as="span" />
            {" →"}
          </Link>
        </Section>
      ) : null}

      {/* Call to action */}
      <section className="border-t bg-primary text-primary-foreground" aria-labelledby="cta-title">
        <Container className="py-14 md:py-16">
          <div className="max-w-2xl">
            <Editable k="home.cta.heading" as="h2" className="font-heading text-3xl font-semibold tracking-tight" />
            <Editable k="home.cta.body" as="p" className="mt-3 text-lg leading-relaxed opacity-90" multiline />
            <Button asChild size="lg" variant="secondary" className="mt-6 px-5 text-base">
              <Link href="/apply">
                <Editable k="home.cta.button" as="span" />
              </Link>
            </Button>
          </div>
          <ManageLink href="/recruitment" canEdit={canEdit} />
        </Container>
      </section>
    </>
  );
}
