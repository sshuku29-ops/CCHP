import Link from "next/link";
import { Editable } from "@/components/cms/editable";
import { ManageLink, PageTitle, Section } from "@/components/public/section";
import { Button } from "@/components/ui/button";
import { canEditContent } from "@/lib/cms/content";
import { getSiteSettings } from "@/lib/public/queries";

export const metadata = {
  title: "Contact",
  description: "How to reach the Colby Community Health Program.",
};

/** No contact form on purpose: email and Instagram only. Applications go through /apply. */
export default async function ContactPage() {
  const [settings, canEdit] = await Promise.all([getSiteSettings(), canEditContent()]);
  const email = settings.contact_email;
  const instagram = settings.instagram_url;

  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle titleKey="contact.heading" introKey="contact.intro" />
        <ManageLink href="/site-content?tab=general" canEdit={canEdit} />
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <Editable k="contact.email.heading" as="h2" className="font-heading text-xl font-semibold" />
          <p className="mt-2">
            {email ? (
              <a href={`mailto:${email}`} className="break-all font-medium text-primary underline-offset-4 hover:underline">
                {email}
              </a>
            ) : (
              <Editable k="contact.email.empty" as="span" className="text-muted-foreground" />
            )}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <Editable k="contact.instagram.heading" as="h2" className="font-heading text-xl font-semibold" />
          <p className="mt-2">
            {instagram ? (
              <a href={instagram} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-primary underline-offset-4 hover:underline">
                {instagram.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "")}
              </a>
            ) : (
              <Editable k="contact.instagram.empty" as="span" className="text-muted-foreground" />
            )}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <Editable k="contact.apply.heading" as="h2" className="font-heading text-xl font-semibold" />
          <Editable k="contact.apply.note" as="p" className="mt-2 text-muted-foreground leading-relaxed" multiline />
          <Button asChild className="mt-4">
            <Link href="/apply">
              <Editable k="contact.apply.button" as="span" />
            </Link>
          </Button>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <Editable k="contact.where.heading" as="h2" className="font-heading text-xl font-semibold" />
          <Editable k="contact.where.body" as="p" className="mt-2 text-muted-foreground leading-relaxed" multiline />
        </div>
      </div>
    </Section>
  );
}
