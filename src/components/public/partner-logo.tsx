import { cn } from "@/lib/utils";

/**
 * A partner's logo (uploaded on /site-content → Partners). Logos are served
 * through /api/files/[key], which allows partner logos without signing in.
 * Renders nothing when the partner has no logo yet.
 */
export function PartnerLogo({ logoKey, name, className }: { logoKey: string | null; name: string; className?: string }) {
  if (!logoKey) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/api/files/${logoKey}`} alt={`${name} logo`} className={cn("max-h-16 w-auto max-w-full object-contain", className)} loading="lazy" />;
}
