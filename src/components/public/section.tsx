import Link from "next/link";
import type { ReactNode } from "react";
import { Editable } from "@/components/cms/editable";
import { cn } from "@/lib/utils";

/**
 * Small layout helpers shared by the public pages so every page looks the
 * same: one content column (max-w-5xl), 16px side gutters on phones,
 * comfortable vertical spacing between sections.
 */

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-5xl px-4", className)}>{children}</div>;
}

export function Section({ children, className, id, ariaLabelledBy }: { children: ReactNode; className?: string; id?: string; ariaLabelledBy?: string }) {
  return (
    <section id={id} aria-labelledby={ariaLabelledBy} className={cn("py-12 md:py-16", className)}>
      <Container>{children}</Container>
    </section>
  );
}

/**
 * Page title block: an editable h1 and an editable intro paragraph.
 * `titleKey` / `introKey` are keys in src/lib/cms/defaults.ts.
 */
export function PageTitle({ titleKey, introKey, id }: { titleKey: string; introKey?: string; id?: string }) {
  return (
    <div id={id} className="max-w-3xl">
      <Editable k={titleKey} as="h1" className="font-heading text-3xl font-semibold tracking-tight md:text-4xl" />
      {introKey ? <Editable k={introKey} as="p" className="mt-4 text-lg text-muted-foreground leading-relaxed" multiline /> : null}
    </div>
  );
}

/**
 * Section heading with optional intro and, for admins, a "Manage" link to
 * the admin page where the data-driven list below it is edited.
 */
export function SectionHeading({
  headingKey,
  introKey,
  id,
  manageHref,
  canEdit,
}: {
  headingKey: string;
  introKey?: string;
  id?: string;
  manageHref?: string;
  canEdit?: boolean;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div id={id} className="max-w-3xl">
        <Editable k={headingKey} as="h2" className="font-heading text-2xl font-semibold tracking-tight md:text-3xl" />
        {introKey ? <Editable k={introKey} as="p" className="mt-2 text-muted-foreground leading-relaxed" multiline /> : null}
      </div>
      {manageHref ? <ManageLink href={manageHref} canEdit={canEdit} /> : null}
    </div>
  );
}

/** Only admins see this. Points to the admin tab where the list is edited. */
export function ManageLink({ href, canEdit }: { href: string; canEdit?: boolean }) {
  if (!canEdit) return null;
  return (
    <Link
      href={href}
      className="print:hidden inline-flex items-center rounded-md border border-amber-900/30 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100"
    >
      Manage
    </Link>
  );
}
