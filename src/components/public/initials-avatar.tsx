import { cn } from "@/lib/utils";

/**
 * Round photo, or a circle with the person's initials when there is no photo.
 * Plain <img> on purpose: photo URLs can point anywhere and we do not want
 * to configure next/image remote patterns for them.
 */
export function InitialsAvatar({
  firstName,
  lastName,
  photoUrl,
  size = "md",
}: {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  size?: "md" | "lg";
}) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const dim = size === "lg" ? "size-24 text-2xl" : "size-16 text-lg";
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt={`${firstName} ${lastName}`} className={cn("rounded-full object-cover bg-muted", dim)} />;
  }
  return (
    <div aria-hidden="true" className={cn("flex items-center justify-center rounded-full bg-primary/10 font-heading font-semibold text-primary", dim)}>
      {initials}
    </div>
  );
}
