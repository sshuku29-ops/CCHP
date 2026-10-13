import Link from "next/link";
import { requireUser, isAdmin } from "@/lib/auth/guards";
import { listFeedback, listMyFeedback } from "@/lib/feedback/queries";
import { setFeedbackStatusAction, saveFeedbackNotesAction, deleteFeedbackAction } from "@/lib/feedback/actions";
import { FEEDBACK_STATUSES } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubmitFeedbackForm } from "./submit-form";

export const metadata = { title: "Feedback & ideas" };

const CATEGORY_LABELS: Record<string, string> = { IDEA: "Idea", ISSUE: "Issue", PRAISE: "Praise", OTHER: "Other" };

/** The status an item usually moves to next, for the one-click button. */
const NEXT_STATUS: Record<string, string | undefined> = {
  NEW: "DISCUSSED",
  DISCUSSED: "ACTIONED",
  ACTIONED: "ARCHIVED",
  ARCHIVED: undefined,
};

export default async function FeedbackPage(props: PageProps<"/feedback">) {
  const user = await requireUser();
  const admin = isAdmin(user);
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" && (FEEDBACK_STATUSES as readonly string[]).includes(sp.status) ? sp.status : "NEW";

  return (
    <div>
      <PageHeader
        title="Feedback & ideas"
        description="Ideas, issues and shout-outs from volunteers and leaders. Admins review the inbox in meetings."
        actions={admin ? <Button variant="outline" size="sm" asChild><a href="/api/export/feedback">Export CSV</a></Button> : null}
      />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Share something</CardTitle>
          <CardDescription>Anything goes — session ideas, things that are not working, or a thank-you.</CardDescription>
        </CardHeader>
        <CardContent>
          <SubmitFeedbackForm />
        </CardContent>
      </Card>

      {admin ? <AdminInbox status={status} /> : <MySubmissions userId={user.id} />}
    </div>
  );
}

/** Admin view: the inbox table with status filter, status actions and notes. */
async function AdminInbox({ status }: { status: string }) {
  const items = await listFeedback(status);
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[...FEEDBACK_STATUSES, "ALL"].map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} asChild>
            <Link href={s === "NEW" ? "/feedback" : `/feedback?status=${s}`}>{s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}</Link>
          </Button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState title="Inbox is clear" description="No feedback items with this status." />
      ) : (
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">From</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead className="hidden md:table-cell w-28">Created</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="text-right w-44">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="align-top">
                  <TableCell>
                    <div className="font-medium">
                      {item.anonymous || !item.author ? <span className="text-muted-foreground">Anonymous</span> : `${item.author.firstName} ${item.author.lastName}`}
                    </div>
                    <div className="text-xs text-muted-foreground">{CATEGORY_LABELS[item.category] ?? item.category}</div>
                    <div className="text-xs text-muted-foreground md:hidden">{fmtDate(item.createdAt)}</div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="whitespace-pre-wrap text-sm">{item.body}</p>
                    {/* Admin notes: a tiny form per row so it works without client JS. */}
                    <form action={saveFeedbackNotesAction.bind(null, item.id)} className="mt-3 space-y-1.5">
                      <label htmlFor={`notes-${item.id}`} className="text-xs font-medium text-muted-foreground">Admin notes</label>
                      <Textarea id={`notes-${item.id}`} name="adminNotes" defaultValue={item.adminNotes ?? ""} rows={2} maxLength={4000} className="text-sm" />
                      <SubmitButton size="xs" variant="outline">Save notes</SubmitButton>
                    </form>
                  </TableCell>
                  <TableCell className="hidden md:table-cell whitespace-nowrap">{fmtDate(item.createdAt)}</TableCell>
                  <TableCell><StatusBadge status={item.status} /></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      {NEXT_STATUS[item.status] ? (
                        <form action={setFeedbackStatusAction.bind(null, item.id, NEXT_STATUS[item.status]!)}>
                          <Button size="xs" variant="secondary" type="submit">
                            Mark {NEXT_STATUS[item.status]!.toLowerCase()}
                          </Button>
                        </form>
                      ) : null}
                      {item.status !== "NEW" ? (
                        <form action={setFeedbackStatusAction.bind(null, item.id, "NEW")}>
                          <Button size="xs" variant="ghost" type="submit">Back to new</Button>
                        </form>
                      ) : null}
                      {item.status !== "ARCHIVED" ? (
                        <form action={setFeedbackStatusAction.bind(null, item.id, "ARCHIVED")}>
                          <Button size="xs" variant="ghost" type="submit">Archive</Button>
                        </form>
                      ) : null}
                      <ConfirmButton size="xs" variant="destructive" message="Delete this feedback item?" action={deleteFeedbackAction.bind(null, item.id)}>
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
    </section>
  );
}

/** Volunteer view: only their own, non-anonymous submissions. */
async function MySubmissions({ userId }: { userId: string }) {
  const items = await listMyFeedback(userId);
  return (
    <section>
      <h2 className="font-heading text-lg font-semibold mb-3">Your submissions</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">You have not submitted anything yet (anonymous submissions are not listed here).</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                <span>{CATEGORY_LABELS[item.category] ?? item.category}</span>
                <span>·</span>
                <span>{fmtDate(item.createdAt)}</span>
                <StatusBadge status={item.status} className="ml-auto" />
              </div>
              <p className="whitespace-pre-wrap text-sm">{item.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
