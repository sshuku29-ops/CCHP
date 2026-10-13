import type { ReactNode } from "react";
import { initials } from "@/lib/utils";

/**
 * Small "stationery" pieces shared by the public pages. They are the parts
 * of a printed handout: a striped band, a scalloped edge, a tear-off strip,
 * and the disc that stands in for a missing photo. All are flat fills built
 * from simple SVG shapes; none use gradients, shadows or outlines.
 */

/** Alternating bars of green and paper, like the band across a brochure's top. */
export function Stripe({ id, height = 40, className = "" }: { id: string; height?: number; className?: string }) {
  return (
    <svg aria-hidden="true" className={`block w-full ${className}`} style={{ height }} role="presentation">
      <defs>
        <pattern id={`stripe-${id}`} width="56" height="8" patternUnits="userSpaceOnUse">
          <rect width="28" height="8" fill="var(--pub-ground)" />
          <rect x="28" width="28" height="8" fill="var(--pub-paper)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#stripe-${id})`} />
    </svg>
  );
}

/**
 * A row of semicircles in the paper colour. Placed directly above a paper
 * panel it reads as a scalloped top edge; flipped, as a scalloped bottom edge.
 */
export function ScallopEdge({ id, flip = false, tone = "paper" }: { id: string; flip?: boolean; tone?: "paper" | "paper-2" }) {
  const fill = tone === "paper" ? "var(--pub-paper)" : "var(--pub-paper-2)";
  return (
    <svg
      aria-hidden="true"
      role="presentation"
      className={`block w-full h-6 ${flip ? "rotate-180" : ""}`}
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id={`scallop-${id}`} width="48" height="24" patternUnits="userSpaceOnUse">
          <circle cx="24" cy="24" r="24" fill={fill} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#scallop-${id})`} />
    </svg>
  );
}

/** A paper sheet with a scalloped top and bottom edge, like a printed card. */
export function Sheet({ id, children, className = "", tone = "paper" }: { id: string; children: ReactNode; className?: string; tone?: "paper" | "paper-2" }) {
  const bg = tone === "paper" ? "pub-paper" : "pub-paper-2";
  return (
    <div className={className}>
      <ScallopEdge id={`${id}-top`} tone={tone} />
      <div className={bg}>{children}</div>
      <ScallopEdge id={`${id}-bottom`} tone={tone} flip />
    </div>
  );
}

/** Initials in a filled disc, used when a leader has no photo. */
export function InitialsDisc({ firstName, lastName, size = 96 }: { firstName: string; lastName: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-full pub-ground font-heading font-medium select-none"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(firstName, lastName)}
    </span>
  );
}

/** A leader's photo (plain <img>, any URL) or the initials disc when there is none. */
export function Portrait({ firstName, lastName, photoUrl, size = 96 }: { firstName: string; lastName: string; photoUrl: string | null; size?: number }) {
  if (photoUrl) {
    return (
      // Plain <img>: photo URLs are set by admins and can point anywhere, which
      // next/image would need pre-approved in next.config.ts.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={`${firstName} ${lastName}`}
        width={size}
        height={size}
        loading="lazy"
        className="rounded-full object-cover pub-paper-2"
        style={{ width: size, height: size }}
      />
    );
  }
  return <InitialsDisc firstName={firstName} lastName={lastName} size={size} />;
}

/** The common page opening for inner pages: a paper sheet with the stripe and a title. */
export function PageSheet({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children?: ReactNode }) {
  return (
    <section className="pub-paper" aria-labelledby={`${id}-title`}>
      <Stripe id={`${id}-stripe`} height={32} />
      <div className="mx-auto max-w-6xl px-[var(--pub-margin)] pt-12 pb-16 md:pt-16 md:pb-24">
        <h1 id={`${id}-title`} className="pub-display max-w-[16ch]">
          {title}
        </h1>
        {intro ? <div className="pub-lead mt-6 max-w-[52ch]">{intro}</div> : null}
        {children}
      </div>
    </section>
  );
}
