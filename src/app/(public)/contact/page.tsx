import Link from "next/link";
import { PageSheet } from "@/components/public/stationery";
import { getSiteSettings } from "@/lib/public/queries";

export const metadata = {
  title: "Contact",
  description: "How to reach the Colby Community Health Program.",
};

/** No form here on purpose: email and Instagram only, and applications go through /apply. */
export default async function ContactPage() {
  const settings = await getSiteSettings();
  const email = settings.contact_email;
  const instagram = settings.instagram_url;

  return (
    <PageSheet id="contact" title="Get in touch" intro="CCHP is run by Colby College students in Waterville, Maine. Here is how to reach us.">
      <dl className="mt-16 space-y-10 max-w-2xl">
        <div>
          <dt className="pub-title">Email</dt>
          <dd className="pub-lead mt-3">
            {email ? (
              <a href={`mailto:${email}`} className="pub-link pub-green-ink break-all">
                {email}
              </a>
            ) : (
              <span className="pub-ink-soft">A contact address will be posted here soon.</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="pub-title">Instagram</dt>
          <dd className="pub-lead mt-3">
            {instagram ? (
              <a href={instagram} className="pub-link pub-green-ink break-all" rel="noopener noreferrer" target="_blank">
                {instagram.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "")}
              </a>
            ) : (
              <span className="pub-ink-soft">Not linked yet.</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="pub-title">Want to join?</dt>
          <dd className="pub-lead mt-3">
            Applications for volunteers, leadership roles, and faculty or community partners all go through{" "}
            <Link href="/apply" className="pub-link pub-green-ink">
              the application page
            </Link>
            , not by email.
          </dd>
        </div>
        <div>
          <dt className="pub-title">Where sessions happen</dt>
          <dd className="pub-lead mt-3">Mid-Maine Homeless Shelter, Waterville, Maine. Sessions are for shelter residents and guests; dates are set with the shelter each semester.</dd>
        </div>
      </dl>
    </PageSheet>
  );
}
