import { requireUser, isMainAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/dates";
import { markAllRead, openNotification, runRemindersNowAction } from "@/lib/reminders/actions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SubmitButton } from "@/components/shared/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifications" };

const TYPE_LABELS: Record<string, string> = {
  TASK_DUE: "Due soon",
  TASK_OVERDUE: "Overdue",
  ASSIGNED: "Assigned",
  SUBMISSION: "Submission",
  WAITING_ON: "Follow-up",
  SYSTEM: "System",
  INFO: "Info",
};

export default async function NotificationsPage(props: PageProps<"/notifications">) {
  const user = await requireUser();
  const sp = await props.searchParams;

  const items = await db.notification.findMany({
    where: { userId: user.id },
    // Unread first (readAt null sorts first with "asc" in SQLite/Postgres via nulls handling below), then newest.
    orderBy: [{ readAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    take: 100,
  });
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : "You are all caught up."}
        actions={
          <>
            {unread ? (
              <form action={markAllRead}>
                <SubmitButton variant="outline" size="sm" pendingText="Marking…">Mark all read</SubmitButton>
              </form>
            ) : null}
            {isMainAdmin(user) ? (
              <form action={runRemindersNowAction}>
                <SubmitButton variant="secondary" size="sm" pendingText="Running…">Run reminders now</SubmitButton>
              </form>
            ) : null}
          </>
        }
      />

      {sp.ran === "1" ? (
        <Alert className="mb-4">
          <AlertTitle>Reminders ran</AlertTitle>
          <AlertDescription>
            Created {sp.taskDue ?? 0} due-soon, {sp.taskOverdue ?? 0} overdue and {sp.waitingOn ?? 0} follow-up notifications; sent {sp.emails ?? 0} email digest{sp.emails === "1" ? "" : "s"}.
          </AlertDescription>
        </Alert>
      ) : null}

      {items.length === 0 ? (
        <EmptyState title="No notifications yet" description="Task reminders and follow-up nudges will show up here." />
      ) : (
        <ul className="divide-y rounded-xl border">
          {items.map((n) => (
            <li key={n.id}>
              {/* The whole row is a submit button: it marks the item read and navigates to its link. */}
              <form action={openNotification.bind(null, n.id)}>
                <button
                  type="submit"
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                    !n.readAt && "bg-primary/5",
                  )}
                >
                  <span className={cn("mt-2 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-primary")} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={cn("text-sm", !n.readAt && "font-medium")}>{n.title}</span>
                      <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[n.type] ?? n.type}</Badge>
                    </span>
                    {n.body ? <span className="block text-sm text-muted-foreground">{n.body}</span> : null}
                    <span className="block text-xs text-muted-foreground mt-0.5">{fmtDateTime(n.createdAt)}</span>
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
