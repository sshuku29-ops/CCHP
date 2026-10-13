import Link from "next/link";
import { ScallopEdge, Stripe } from "@/components/public/stationery";
import type { PublicSettings } from "@/lib/public/queries";

/**
 * The footer is the back of the brochure: a paper panel with a scalloped top
 * edge on the green ground. Left, a sign-off and the mission. Right, the
 * address block (email, Instagram, apply, team sign in) and a small stamp.
 */
export function SiteFooter({ settings }: { settings: PublicSettings }) {
  const email = settings.contact_email;
  const instagram = settings.instagram_url;
  const instagramHandle = instagram ? instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "@").replace(/\/+$/, "") : "";

  return (
    <footer className="pub-ground mt-auto">
      <Stripe id="footer-stripe" height={8} className="opacity-100" />
      <div className="mx-auto max-w-6xl px-[var(--pub-margin)] pt-10 pb-6">
        <ScallopEdge id="footer" />
        <div className="pub-paper px-6 py-10 md:px-12 md:py-14">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <p className="pub-title max-w-[14ch]">Handed to you by CCHP students.</p>
              <p className="pub-body mt-5 max-w-[46ch]">
                {settings.mission || "Free, accessible health and wellness education for Waterville community members, delivered through real conversations."}
              </p>
            </div>
            <div className="md:justify-self-end flex gap-8 items-start">
              <address className="not-italic pub-body">
                <ul className="space-y-3">
                  {email ? (
                    <li>
                      <a href={`mailto:${email}`} className="pub-link pub-green-ink break-all">
                        {email}
                      </a>
                    </li>
                  ) : null}
                  {instagram ? (
                    <li>
                      <a href={instagram} className="pub-link pub-green-ink" rel="noopener noreferrer" target="_blank">
                        Instagram {instagramHandle}
                      </a>
                    </li>
                  ) : null}
                  <li>
                    <Link href="/contact" className="pub-link pub-green-ink">
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link href="/apply" className="pub-link pub-green-ink">
                      Apply to volunteer
                    </Link>
                  </li>
                  <li>
                    <Link href="/login" className="pub-link pub-small pub-ink-soft">
                      Team sign in
                    </Link>
                  </li>
                </ul>
              </address>
              {/* The stamp in the corner: perforated edge, CCHP in the middle. */}
              <div aria-hidden="true" className="hidden sm:block shrink-0 pub-ground p-1.5" style={{ width: 72 }}>
                <div className="pub-paper-2 w-full aspect-[3/4] grid place-items-center">
                  <span className="font-heading font-semibold text-sm">CCHP</span>
                </div>
              </div>
            </div>
          </div>
          <p className="pub-small pub-ink-soft text-center mt-12">
            Built and maintained by CCHP students. Colby Community Health Program, Waterville, Maine.
          </p>
        </div>
      </div>
    </footer>
  );
}
