import { PageSheet } from "@/components/public/stationery";
import { getPartners } from "@/lib/public/queries";

export const metadata = {
  title: "Partners",
  description: "The community organizations CCHP works with in Waterville, Maine.",
};

export default async function PartnersPage() {
  const partners = await getPartners();

  return (
    <PageSheet
      id="partners"
      title="Who we work with"
      intro="CCHP is run by students, but every session depends on the organizations below. They host us, advise us and connect us to the people we serve."
    >
      {partners.length === 0 ? (
        <p className="pub-body pub-ink-soft mt-12">Partner organizations will be listed here.</p>
      ) : (
        <ul className="mt-16 space-y-14 max-w-3xl">
          {partners.map((p) => (
            <li key={p.id}>
              <h2 className="font-heading font-medium text-[clamp(1.6rem,2.6vw,2.2rem)] leading-tight text-balance">{p.name}</h2>
              {p.description ? <p className="pub-body mt-4 max-w-[60ch]">{p.description}</p> : null}
              {p.url ? (
                <p className="pub-body mt-3">
                  <a href={p.url} className="pub-link pub-green-ink break-all" rel="noopener noreferrer" target="_blank">
                    {displayUrl(p.url)}
                  </a>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </PageSheet>
  );
}

/** "https://www.example.org/path/" → "example.org/path" */
function displayUrl(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "");
}
