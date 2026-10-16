import { Editable } from "@/components/cms/editable";
import { ManageLink, PageTitle, Section } from "@/components/public/section";
import { canEditContent } from "@/lib/cms/content";
import { fmtDate } from "@/lib/dates";
import { getPublishedResourcesByCategory, type PublicResource } from "@/lib/public/queries";

export const metadata = {
  title: "Local resources",
  description: "Free local help near the Mid-Maine Homeless Shelter: phone numbers, addresses and websites, checked by CCHP leaders.",
};

export default async function ResourcesPage() {
  const [groups, canEdit] = await Promise.all([getPublishedResourcesByCategory(), canEditContent()]);

  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle titleKey="resources.heading" introKey="resources.intro" />
        <ManageLink href="/site-content?tab=resources" canEdit={canEdit} />
      </div>

      {groups.length === 0 ? (
        <Editable k="resources.empty" as="p" className="mt-10 text-muted-foreground" />
      ) : (
        <div className="mt-10 space-y-12">
          {groups.map((g) => (
            <section key={g.category} aria-labelledby={`cat-${slug(g.category)}`}>
              <h2 id={`cat-${slug(g.category)}`} className="font-heading text-2xl font-semibold">
                {g.category}
              </h2>
              <ul className="mt-4 grid gap-4 md:grid-cols-2">
                {g.items.map((r) => (
                  <ResourceCard key={r.id} r={r} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Section>
  );
}

function ResourceCard({ r }: { r: PublicResource }) {
  return (
    <li className="rounded-lg border bg-card p-5">
      <h3 className="text-lg font-semibold">{r.name}</h3>
      {r.description ? <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{r.description}</p> : null}
      <dl className="mt-3 space-y-1 text-sm">
        {r.phone ? (
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-muted-foreground">Phone</dt>
            <dd>
              <a href={`tel:${telHref(r.phone)}`} className="font-medium text-primary underline-offset-4 hover:underline">
                {r.phone}
              </a>
            </dd>
          </div>
        ) : null}
        {r.address ? (
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-muted-foreground">Address</dt>
            <dd>{r.address}</dd>
          </div>
        ) : null}
        {r.url ? (
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-muted-foreground">Website</dt>
            <dd className="min-w-0">
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline-offset-4 hover:underline">
                {r.url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "")}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        {r.lastVerifiedAt ? (
          <>
            <Editable k="resources.verified" as="span" /> {fmtDate(r.lastVerifiedAt)}
          </>
        ) : null}
        {r.lastVerifiedAt && r.owner ? " · " : null}
        {r.owner ? (
          <>
            <Editable k="resources.owner" as="span" /> {r.owner.firstName}
            {r.owner.leadershipTitle ? `, ${r.owner.leadershipTitle}` : ""}
          </>
        ) : null}
      </p>
    </li>
  );
}

/** "207-555-0100 ext. 2" -> "2075550100" for the tel: link. */
function telHref(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
