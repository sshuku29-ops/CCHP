import { Editable } from "@/components/cms/editable";
import { ManageLink, PageTitle, Section } from "@/components/public/section";
import { canEditContent } from "@/lib/cms/content";
import { getPartners } from "@/lib/public/queries";

export const metadata = {
  title: "Community partners",
  description: "The organizations CCHP works with in Waterville, Maine.",
};

export default async function PartnersPage() {
  const [partners, canEdit] = await Promise.all([getPartners(), canEditContent()]);

  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle titleKey="partners.heading" introKey="partners.intro" />
        <ManageLink href="/site-content?tab=partners" canEdit={canEdit} />
      </div>

      {partners.length === 0 ? (
        <Editable k="partners.empty" as="p" className="mt-10 text-muted-foreground" />
      ) : (
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {partners.map((p) => (
            <li key={p.id} className="rounded-lg border bg-card p-5">
              <h2 className="font-heading text-xl font-semibold">{p.name}</h2>
              {p.description ? <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.description}</p> : null}
              {p.url ? (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  <Editable k="partners.visit" as="span" />
                  {" ↗"}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
