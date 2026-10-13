import { Editable } from "@/components/cms/editable";

/** A plain number with an editable caption underneath. */
export function StatTile({ value, labelKey }: { value: number | string; labelKey: string }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="font-heading text-3xl font-semibold tabular-nums md:text-4xl">{typeof value === "number" ? value.toLocaleString("en-US") : value}</p>
      <Editable k={labelKey} as="p" className="mt-1 text-sm text-muted-foreground" />
    </div>
  );
}
