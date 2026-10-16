import { UserAvatar } from "@/components/shared/user-avatar";
import { InitialsAvatar } from "@/components/public/initials-avatar";

/**
 * Avatar for the public site. Uses the shared <UserAvatar> (uploaded photo
 * via photoKey, initials fallback). Older leadership profiles may still have
 * an external photo link (photoUrl) and no upload; those fall back to the
 * legacy <InitialsAvatar> image so the photo is not lost.
 */
export function PersonAvatar({
  person,
  size = "md",
  className,
}: {
  person: { firstName: string; lastName: string; photoKey?: string | null; photoUrl?: string | null };
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  if (!person.photoKey && person.photoUrl) {
    return <InitialsAvatar firstName={person.firstName} lastName={person.lastName} photoUrl={person.photoUrl} size={size === "xl" || size === "lg" ? "lg" : "md"} />;
  }
  return <UserAvatar user={person} size={size} className={className} />;
}
