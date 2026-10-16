import Link from "next/link";
import { format } from "date-fns";
import { requireUser, isAdmin } from "@/lib/auth/guards";
import { getCalendarItems, getCalendarEvent } from "@/lib/calendar/queries";
import { deleteEventAction } from "@/lib/calendar/actions";
import { fmtDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthGrid } from "@/components/calendar/month-grid";
import { TYPE_STYLES, TYPE_LABELS, formatDayLabel } from "@/lib/calendar/display";
import { EventForm } from "./event-form";
import { cn } from "@/lib/utils";

export const metadata = { title: "Calendar" };

/** Today's day key in the server's timezone (matches how events are stored). */
function todayKey() {
  return format(new Date(), "yyyy-MM-dd");
}

export default async function CalendarPage(props: PageProps<"/calendar">) {
  const user = await requireUser();
  const admin = isAdmin(user);
  const sp = await props.searchParams;

  const today = todayKey();
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : today.slice(0, 7);
  const day = typeof sp.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) ? sp.day : undefined;
  const editId = admin && typeof sp.edit === "string" ? sp.edit : null;
  const showNew = admin && sp.new === "1";

  // Range for the month grid (UTC midnight boundaries).
  const [y, m] = month.split("-").map(Number);
  const monthStart = new Date(Date.UTC(y, m - 1, 1));
  const monthEnd = new Date(Date.UTC(y, m, 1));
  // Range for the agenda: today through 30 days from now.
  const [ty, tm, td] = today.split("-").map(Number);
  const agendaStart = new Date(Date.UTC(ty, tm - 1, td));
  const agendaEnd = new Date(agendaStart.getTime() + 30 * 86_400_000);

  const [monthItems, agendaItems, editing] = await Promise.all([
    getCalendarItems(user, monthStart, monthEnd),
    getCalendarItems(user, agendaStart, agendaEnd),
    editId ? getCalendarEvent(editId) : null,
  ]);

  // Group the agenda by day so it reads like a list of days.
  const agendaByDay = new Map<string, typeof agendaItems>();
  for (const it of agendaItems) {
    const list = agendaByDay.get(it.date) ?? [];
    list.push(it);
    agendaByDay.set(it.date, list);
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        description={admin ? "Meetings, sessions, task due dates and outreach follow-ups in one place." : "Sessions, meetings and your task due dates."}
        actions={admin ? <Button size="sm" asChild><Link href={`/calendar?month=${month}&new=1`}>Add event</Link></Button> : null}
      />

      {showNew || editing ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editing ? "Edit event" : "New event"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <EventForm
              month={month}
              initial={
                editing
                  ? {
                      id: editing.id,
                      title: editing.title,
                      type: editing.type,
                      startDate: format(editing.startsAt, "yyyy-MM-dd"),
                      startTime: format(editing.startsAt, "HH:mm"),
                      endDate: editing.endsAt ? format(editing.endsAt, "yyyy-MM-dd") : "",
                      endTime: editing.endsAt ? format(editing.endsAt, "HH:mm") : "",
                      location: editing.location ?? "",
                      description: editing.description ?? "",
                    }
                  : undefined
              }
            />
            {editing ? (
              <div className="border-t pt-4">
                <ConfirmButton variant="destructive" size="sm" message="Delete this event?" action={deleteEventAction.bind(null, editing.id)}>
                  Delete event
                </ConfirmButton>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <MonthGrid month={month} today={today} items={monthItems} initialDay={day} />

      {/* Agenda: next 30 days */}
      <section className="mt-8">
        <h2 className="font-heading text-lg font-semibold mb-3">Next 30 days</h2>
        {agendaByDay.size === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing coming up in the next 30 days.</p>
        ) : (
          <div className="space-y-4">
            {[...agendaByDay.entries()].map(([d, list]) => (
              <div key={d} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
                <div className={cn("text-sm font-medium", d === today && "text-primary")}>
                  {d === today ? "Today" : formatDayLabel(d)}
                </div>
                <ul className="space-y-1">
                  {list.map((it) => (
                    <li key={it.id} className="flex items-center gap-2 text-sm">
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs", TYPE_STYLES[it.type] ?? TYPE_STYLES.OTHER)}>
                        {TYPE_LABELS[it.type] ?? it.type}
                      </span>
                      {it.time ? <span className="shrink-0 text-xs text-muted-foreground">{it.time}</span> : null}
                      <Link href={it.href} className="truncate hover:underline">{it.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {editing ? (
        <p className="mt-6 text-xs text-muted-foreground">
          Editing event created {fmtDateTime(editing.createdAt)}.
        </p>
      ) : null}
    </div>
  );
}
