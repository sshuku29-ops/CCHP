import Link from "next/link";

/** Public navigation. "Team sign in" lives in the footer on purpose, not here. */
const NAV = [
  { href: "/#about", label: "About" },
  { href: "/team", label: "Team" },
  { href: "/impact", label: "Impact" },
  { href: "/reports", label: "Reports" },
  { href: "/resources", label: "Resources" },
  { href: "/partners", label: "Partners" },
];

export function SiteHeader() {
  return (
    <header className="pub-ground">
      <div className="mx-auto max-w-6xl px-[var(--pub-margin)] py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href="/" className="font-heading text-2xl font-semibold tracking-tight no-underline mr-auto" aria-label="CCHP home">
          CCHP
        </Link>
        <nav aria-label="Main">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 pub-small">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="pub-link no-underline hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Link href="/apply" className="pub-btn pub-btn-paper min-h-[2.5rem] px-4 text-[15px]">
          Apply
        </Link>
      </div>
    </header>
  );
}
