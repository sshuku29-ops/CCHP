import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * A person's photo (uploaded through My account) with an initials fallback.
 * Use this everywhere a person appears so photos are visible platform-wide.
 */
export function UserAvatar({
  user,
  className,
  size = "md",
}: {
  user: { firstName: string; lastName: string; photoKey?: string | null };
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const sizes = { xs: "size-6 text-[10px]", sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-16 text-lg", xl: "size-28 text-3xl" };
  return (
    <Avatar className={cn(sizes[size], className)}>
      {user.photoKey ? <AvatarImage src={`/api/files/${user.photoKey}`} alt={`${user.firstName} ${user.lastName}`} className="object-cover" /> : null}
      <AvatarFallback className="bg-[var(--cchp-green-soft)] text-[var(--cchp-green)] font-medium">
        {initials(user.firstName, user.lastName)}
      </AvatarFallback>
    </Avatar>
  );
}
