import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";

/** Label + control + optional help text + error, stacked. Used by every LMS/hours form. */
export function Field({
  id,
  label,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  help?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
      <FieldError msg={error} />
    </div>
  );
}
