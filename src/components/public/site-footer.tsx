import Link from "next/link";
import { Editable } from "@/components/cms/editable";
import type { PublicSettings } from "@/lib/public/queries";

/** Footer for every public page. Hidden when printing. */
export function SiteFooter({ settings, colbyLogoKey }: { settings: PublicSettings; colbyLogoKey: string | null }) {
  const year = new Date().getFullYear();
  return (
    <footer className="print:hidden border-t bg-muted/40">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-4">
        <div>
          <p className="font-heading text-lg font-semibold">CCHP</p>
          <Editable k="site.fullName" as="p" className="text-sm text-muted-foreground mt-1" />
          <Editable k="footer.tagline" as="p" className="text-sm text-muted-foreground mt-3" multiline />
        </div>

        <nav aria-label="Footer">
          <p className="text-sm font-semibold">Pages</p>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">
            {[
              { href: "/team", label: "Team" },
              { href: "/impact", label: "Impact" },
              { href: "/reports", label: "Reports" },
              { href: "/resources", label: "Resources" },
              { href: "/partners", label: "Partners" },
              { href: "/contact", label: "Contact" },
              { href: "/apply", label: "Apply" },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-muted-foreground hover:text-foreground hover:underline underline-offset-4">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="text-sm">
          <p className="font-semibold">Get in touch</p>
          <ul className="mt-2 space-y-1">
            {settings.contact_email ? (
              <li>
                <a href={`mailto:${settings.contact_email}`} className="text-muted-foreground hover:text-foreground hover:underline underline-offset-4 break-all">
                  {settings.contact_email}
                </a>
              </li>
            ) : null}
            {settings.instagram_url ? (
              <li>
                <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground hover:underline underline-offset-4">
                  Instagram
                </a>
              </li>
            ) : null}
            <li>
              <Link href="/login" className="text-muted-foreground hover:text-foreground hover:underline underline-offset-4">
                Team sign in
              </Link>
            </li>
          </ul>
        </div>

        {/* Colby affiliation. The logo is the Document with category LOGO whose title contains "Colby".
            data-approval="pending": use of the Colby College logo still needs the College's OK. */}
        <div className="text-sm md:text-right" data-approval="pending">
          {colbyLogoKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/files/${colbyLogoKey}`} alt="Colby College" className="inline-block h-12 w-auto object-contain" loading="lazy" />
          ) : null}
          <Editable k="footer.colby" as="p" className="mt-2 text-muted-foreground" />
        </div>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-muted-foreground">
          © {year} Colby Community Health Program. No personal information about shelter residents is ever collected or published.
        </p>
      </div>
    </footer>
  );
}
