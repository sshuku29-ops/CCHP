import Link from "next/link";
import { notFound } from "next/navigation";
import { Editable } from "@/components/cms/editable";
import { RichText } from "@/components/editor/rich-text";
import { PersonAvatar } from "@/components/public/person-avatar";
import { Container, ManageLink } from "@/components/public/section";
import { canEditContent } from "@/lib/cms/content";
import { classYearLabel, getPublicProfile } from "@/lib/public/queries";

export async function generateMetadata(props: PageProps<"/team/[id]">) {
  const person = await getPublicProfile((await props.params).id);
  return person
    ? { title: `${person.firstName} ${person.lastName}`, description: person.bio ?? person.leadershipTitle ?? undefined }
    : { title: "Profile not found" };
}

/**
 * Public profile for one leadership team member. Only people who turned on
 * "Show on the public site" have a page here; everyone else is a 404.
 */
export default async function PublicProfilePage(props: PageProps<"/team/[id]">) {
  const { id } = await props.params;
  const [person, canEdit] = await Promise.all([getPublicProfile(id), canEditContent()]);
  if (!person) notFound();

  const classYear = classYearLabel(person.graduationDate);
  const facts = [person.pronouns, person.major, classYear].filter((f): f is string => !!f);

  return (
    <article className="py-12 md:py-16">
      <Container className="max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href="/team" className="text-muted-foreground hover:text-foreground hover:underline underline-offset-4">
            {"← "}
            <Editable k="profile.back" as="span" />
          </Link>
          <ManageLink href="/site-content?tab=leadership" canEdit={canEdit} />
        </div>

        <header className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
          <PersonAvatar person={person} size="xl" />
          <div className="min-w-0">
            <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              {person.firstName} {person.lastName}
            </h1>
            {person.leadershipTitle ? <p className="mt-1 text-lg font-medium text-primary">{person.leadershipTitle}</p> : null}
            {facts.length > 0 ? <p className="mt-2 text-sm text-muted-foreground">{facts.join(" · ")}</p> : null}
          </div>
        </header>

        {person.bio ? <p className="mt-8 text-lg leading-relaxed text-muted-foreground">{person.bio}</p> : null}

        {person.profileBody ? (
          <section className="mt-8" aria-label="About">
            <RichText source={person.profileBody} className="leading-relaxed" />
          </section>
        ) : null}

        <section className="mt-10 rounded-lg border bg-card p-5 sm:max-w-xs" aria-label="Sessions">
          <p className="font-heading text-3xl font-semibold tabular-nums">{person.sessionsCount.toLocaleString("en-US")}</p>
          <Editable k="profile.sessions.label" as="p" className="mt-1 text-sm font-medium" />
          <Editable k="profile.sessions.note" as="p" className="mt-1 text-xs text-muted-foreground" />
        </section>
      </Container>
    </article>
  );
}
