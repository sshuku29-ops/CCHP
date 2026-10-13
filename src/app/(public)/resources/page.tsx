import { PageSheet } from "@/components/public/stationery";
import { fmtDate } from "@/lib/dates";
import { getPublishedResourcesByCategory, type PublicResource } from "@/lib/public/queries";

export const metadata = {
  title: "Local resources",
  description: "Free local help near the Mid-Maine Homeless Shelter: phone numbers, addresses and websites, checked by CCHP leaders.",
};

export default async function ResourcesPage() {
  const groups = await getPublishedResourcesByCategory();

  return (
    <PageSheet
      id="resources"
      title="Local resources"
      intro="The phone numbers and places we point to during sessions. A CCHP leader owns each entry and checks it; the date it was last checked is shown so you know how fresh it is."
    >
      {groups.length === 0 ? (
        <p className="pub-body pub-ink-soft mt-12">Resources will be listed here once they have been checked.</p>
      ) : (
        <div className="mt-16 space-y-20">
          {groups.map((g) => (
            <section key={g.category} aria-labelledby={`cat-${slug(g.category)}`}>
              <h2 id={`cat-${slug(g.category)}`} className="pub-title">
                {g.category}
              </h2>
              <ul className="mt-8 grid gap-x-12 gap-y-12 md:grid-cols-2">
                {g.items.map((r) => (
                  <li key={r.id} className="max-w-[48ch]">
                    <ResourceEntry r={r} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageSheet>
  );
}

function ResourceEntry({ r }: { r: PublicResource }) {
  return (
    <>
      <h3 className="font-heading font-medium text-[1.5rem] leading-tight">{r.name}</h3>
      {r.description ? <p className="pub-body mt-3">{r.description}</p> : null}
      <dl className="pub-body mt-4 space-y-1.5">
        {r.phone ? (
          <div className="flex gap-3">
            <dt className="pub-ink-soft w-16 shrink-0">Phone</dt>
            <dd>
              <a href={`tel:${telHref(r.phone)}`} className="pub-link pub-green-ink">
                {r.phone}
              </a>
            </dd>
          </div>
        ) : null}
        {r.address ? (
          <div className="flex gap-3">
            <dt className="pub-ink-soft w-16 shrink-0">Address</dt>
            <dd>{r.address}</dd>
          </div>
        ) : null}
        {r.url ? (
          <div className="flex gap-3">
            <dt className="pub-ink-soft w-16 shrink-0">Website</dt>
            <dd>
              <a href={r.url} className="pub-link pub-green-ink break-all" rel="noopener noreferrer" target="_blank">
                {r.url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "")}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="pub-small pub-ink-soft mt-4">
        {r.lastVerifiedAt ? `Last verified ${fmtDate(r.lastVerifiedAt)}` : "Not yet verified"}
        {r.owner ? ` · kept up to date by ${r.owner.firstName}${r.owner.leadershipTitle ? `, ${r.owner.leadershipTitle}` : ""}` : ""}
      </p>
    </>
  );
}

/** Keep digits and a leading plus so "1-888-568-1112" becomes a dialable tel: link. */
function telHref(phone: string) {
  const plus = phone.trim().startsWith("+") ? "+" : "";
  return plus + phone.replace(/\D/g, "");
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
