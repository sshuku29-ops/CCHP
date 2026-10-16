import Link from "next/link";
import { requireModule } from "@/lib/auth/guards";
import { listWaitingOn, getWaitingOn, listAdminsForSelect } from "@/lib/outreach/queries";
import { markRepliedAction, closeWaitingOnAction, reopenWaitingOnAction, deleteWaitingOnAction } from "@/lib/outreach/actions";
import { WAITING_STATUSES } from "@/lib/constants";
import { fmtDate, toDateInput } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WaitingOnForm } from "./form";

export const metadata = { title: "Waiting on" };

/**
 * Outreach tracker. Everything is server-rendered: filters are plain links,
 * the create/edit form appears when ?new=1 or ?edit=<id> is in the URL, and
 * one-click actions are tiny <form>s bound to server actions.
 */
export default async function WaitingOnPage(props: PageProps<"/waiting-on">) {
  const user = await requireModule("projects");
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" && (WAITING_STATUSES as readonly string[]).includes(sp.status) ? sp.status : "WAITING";
  const mine = sp.mine === "1";
  const focusId = typeof sp.focus === "string" ? sp.focus : null;
  const editId = typeof sp.edit === "string" ? sp.edit : null;
  const showNew = sp.new === "1";

  const [items, admins, editing] = await Promise.all([
    listWaitingOn({ status, ownerId: mine ? user.id : undefined }),
    listAdminsForSelect(),
    editId ? getWaitingOn(editId) : null,
  ]);

  // Build filter links that keep the other filter in place.
  const filterHref = (next: { status?: string; mine?: boolean }) => {
    const q = new URLSearchParams();
    const s = next.status ?? status;
    const m = next.mine ?? mine;
    if (s !== "WAITING") q.set("status", s);
    if (m) q.set("mine", "1");
    const qs = q.toString();
    return `/waiting-on${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Waiting on"
        description="External outreach you are waiting to hear back on. We only count days since sent — no email tracking."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <a href="/api/export/waiting-on">Export CSV</a>
            </Button>
            <Button size="sm" asChild>
              <Link href="/waiting-on?new=1">New item</Link>
            </Button>
          </>
        }
      />

      {showNew || editing ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editing ? "Edit item" : "New outreach item"}</CardTitle>
          </CardHeader>
          <CardContent>
            <WaitingOnForm
              admins={admins}
              initial={
                editing
                  ? {
                      id: editing.id,
                      contactName: editing.contactName,
                      organization: editing.organization ?? "",
                      whatSent: editing.whatSent,
                      channel: editing.channel ?? "",
                      sentAt: toDateInput(editing.sentAt),
                      remindAfterDays: editing.remindAfterDays,
                      ownerId: editing.ownerId ?? "",
                      notes: editing.notes ?? "",
                    }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["WAITING", "REPLIED", "CLOSED", "ALL"].map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} asChild>
            <Link href={filterHref({ status: s })}>{s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}</Link>
          </Button>
        ))}
        <span className="mx-1 text-muted-foreground">·</span>
        <Button size="sm" variant={mine ? "default" : "outline"} asChild>
          <Link href={filterHref({ mine: !mine })}>Mine</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Nothing here"
          description={mine ? "You do not own any items with this status." : "No outreach items with this status."}
          action={<Button asChild><Link href="/waiting-on?new=1">Add the first one</Link></Button>}
        />
      ) : (
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead className="hidden md:table-cell">What was sent</TableHead>
                <TableHead className="hidden lg:table-cell">Channel</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Days</TableHead>
                <TableHead className="hidden md:table-cell">Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} id={item.id} className={focusId === item.id ? "bg-amber-50 dark:bg-amber-900/20" : undefined}>
                  <TableCell>
                    <div className="font-medium">{item.contactName}</div>
                    {item.organization ? <div className="text-xs text-muted-foreground">{item.organization}</div> : null}
                    <div className="text-xs text-muted-foreground md:hidden mt-1">{item.whatSent}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-xs">
                    <div className="truncate" title={item.whatSent}>{item.whatSent}</div>
                    {item.notes ? <div className="text-xs text-muted-foreground truncate" title={item.notes}>{item.notes}</div> : null}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{item.channel ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtDate(item.sentAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="tabular-nums">{item.daysSince}</span>
                      {item.needsFollowUp ? (
                        <Badge variant="destructive" className="w-fit">Needs follow-up</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {item.owner ? `${item.owner.firstName} ${item.owner.lastName}` : <span className="text-muted-foreground">Unassigned</span>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                    {item.repliedAt ? <div className="text-xs text-muted-foreground mt-1">{fmtDate(item.repliedAt)}</div> : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="xs" variant="outline" asChild>
                        <Link href={`/waiting-on?edit=${item.id}`}>Edit</Link>
                      </Button>
                      {item.status === "WAITING" ? (
                        <>
                          <form action={markRepliedAction.bind(null, item.id)}>
                            <Button size="xs" variant="secondary" type="submit">Replied</Button>
                          </form>
                          <form action={closeWaitingOnAction.bind(null, item.id)}>
                            <Button size="xs" variant="ghost" type="submit">Close</Button>
                          </form>
                        </>
                      ) : (
                        <form action={reopenWaitingOnAction.bind(null, item.id)}>
                          <Button size="xs" variant="ghost" type="submit">Reopen</Button>
                        </form>
                      )}
                      <ConfirmButton
                        size="xs"
                        variant="destructive"
                        message="Delete this outreach item? This cannot be undone."
                        action={deleteWaitingOnAction.bind(null, item.id)}
                      >
                        Delete
                      </ConfirmButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
