"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarItem } from "@/lib/calendar/queries";
import { TYPE_STYLES, TYPE_LABELS, formatDayLabel } from "@/lib/calendar/display";
export { TYPE_STYLES, TYPE_LABELS, formatDayLabel };

/**
 * Month view. This is the only client component on the calendar page: it
 * only needs state for "which day is selected". Month navigation is done
 * with plain links (?month=YYYY-MM) so the server re-fetches the right data.
 */

/** Colour for each item type (chips in the grid and dots in the day list). */


const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function MonthGrid({
  month,
  today,
  items,
  initialDay,
}: {
  /** "YYYY-MM" being displayed. */
  month: string;
  /** Today's day key "YYYY-MM-DD". */
  today: string;
  items: CalendarItem[];
  /** Optional day to pre-select (from ?day=). */
  initialDay?: string;
}) {
  const [selected, setSelected] = useState<string | null>(initialDay ?? null);

  const [year, monthIndex] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(year, monthIndex - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();

  // Group items by day for quick lookup.
  const byDay = new Map<string, CalendarItem[]>();
  for (const it of items) {
    const list = byDay.get(it.date) ?? [];
    list.push(it);
    byDay.set(it.date, list);
  }

  // Build the cells: leading blanks, then one per day.
  const cells: (string | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedItems = selected ? byDay.get(selected) ?? [] : [];

  return (
    <div className="space-y-4">
      {/* Header: month name + navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-xl font-semibold">
          {MONTHS[monthIndex - 1]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" asChild aria-label="Previous month">
            <Link href={`/calendar?month=${shiftMonth(month, -1)}`}><ChevronLeft /></Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/calendar?month=${today.slice(0, 7)}&day=${today}`}>Today</Link>
          </Button>
          <Button variant="outline" size="icon-sm" asChild aria-label="Next month">
            <Link href={`/calendar?month=${shiftMonth(month, 1)}`}><ChevronRight /></Link>
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.keys(TYPE_LABELS).map((t) => (
          <span key={t} className={cn("rounded-full px-2 py-0.5", TYPE_STYLES[t])}>{TYPE_LABELS[t]}</span>
        ))}
      </div>

      {/* Grid */}
      <div className="rounded-xl border overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1.5">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={`blank-${i}`} className="min-h-16 sm:min-h-24 border-b border-r bg-muted/20" />;
            const dayItems = byDay.get(day) ?? [];
            const isToday = day === today;
            const isSelected = day === selected;
            return (
              <button
                type="button"
                key={day}
                onClick={() => setSelected(isSelected ? null : day)}
                className={cn(
                  "min-h-16 sm:min-h-24 border-b border-r p-1 text-left align-top transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected && "bg-muted/60",
                )}
              >
                <div
                  className={cn(
                    "mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs",
                    isToday ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground",
                  )}
                >
                  {Number(day.slice(-2))}
                </div>
                {/* Small screens: just a dot per item. Larger screens: up to 3 chips. */}
                <div className="flex flex-wrap gap-0.5 sm:hidden">
                  {dayItems.slice(0, 6).map((it) => (
                    <span key={it.id} className={cn("size-1.5 rounded-full", TYPE_STYLES[it.type] ?? TYPE_STYLES.OTHER)} />
                  ))}
                </div>
                <div className="hidden sm:block space-y-0.5">
                  {dayItems.slice(0, 3).map((it) => (
                    <div key={it.id} className={cn("truncate rounded px-1 text-[11px] leading-5", TYPE_STYLES[it.type] ?? TYPE_STYLES.OTHER)} title={it.title}>
                      {it.time ? <span className="mr-1 opacity-70">{it.time}</span> : null}
                      {it.title}
                    </div>
                  ))}
                  {dayItems.length > 3 ? (
                    <div className="px-1 text-[11px] text-muted-foreground">+{dayItems.length - 3} more</div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selected ? (
        <div className="rounded-xl border p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium">{formatDayLabel(selected)}</h3>
            <Button variant="ghost" size="xs" onClick={() => setSelected(null)}>Close</Button>
          </div>
          {selectedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
          ) : (
            <ul className="space-y-1.5">
              {selectedItems.map((it) => (
                <li key={it.id} className="flex items-center gap-2 text-sm">
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs", TYPE_STYLES[it.type] ?? TYPE_STYLES.OTHER)}>
                    {TYPE_LABELS[it.type] ?? it.type}
                  </span>
                  {it.time ? <span className="shrink-0 text-xs text-muted-foreground">{it.time}</span> : null}
                  <Link href={it.href} className="truncate hover:underline">{it.title}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
