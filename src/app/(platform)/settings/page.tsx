import Link from "next/link";
import { requireMainAdmin } from "@/lib/auth/guards";
import { getSettingsOverview, getEnvChecklist } from "@/lib/admin/queries";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import { fmtDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SignOutAllButton } from "@/components/admin/sign-out-all-button";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireMainAdmin();
  const [overview, env] = await Promise.all([getSettingsOverview(), getEnvChecklist()]);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Platform overview for the Main Admin: who has access, what changed recently, and how the host is configured."
        actions={
          <>
            <Button asChild variant="outline"><Link href="/settings/users">Users &amp; roles</Link></Button>
            <Button asChild variant="outline"><Link href="/site-content">Public site content</Link></Button>
          </>
        }
      />

      {/* Counts */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        {ROLES.map((r) => (
          <StatCard key={r} label={ROLE_LABELS[r]} value={overview.usersByRole[r] ?? 0} hint="accounts" />
        ))}
        <StatCard label="Active accounts" value={overview.activeUsers} hint="can sign in" />
        <StatCard label="Active sessions" value={overview.activeSessions} hint="signed-in devices" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>The last 50 audited changes (logins, user edits, content updates).</CardDescription>
          </CardHeader>
          <CardContent>
            {overview.recentActivity.length === 0 ? (
              <EmptyState title="No activity yet" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.recentActivity.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDateTime(a.createdAt)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {a.actor ? `${a.actor.firstName} ${a.actor.lastName}` : <span className="text-muted-foreground">system</span>}
                        </TableCell>
                        <TableCell><code className="text-xs">{a.action}</code></TableCell>
                        <TableCell className="max-w-48 truncate text-xs text-muted-foreground">{a.target ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Environment */}
          <Card>
            <CardHeader>
              <CardTitle>Environment</CardTitle>
              <CardDescription>Which settings the host provides. Values are never shown here — edit them in the host&apos;s dashboard or <code>.env</code>.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {env.map((e) => (
                  <li key={e.name} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <code className="text-xs">{e.name}</code>
                      <p className="text-xs text-muted-foreground">{e.hint}</p>
                    </div>
                    <Badge variant="secondary" className={e.set ? "bg-emerald-100 text-emerald-900 border-transparent" : "bg-amber-100 text-amber-900 border-transparent"}>
                      {e.set ? "set" : "not set"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Links */}
          <Card>
            <CardHeader>
              <CardTitle>Guides</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p><Link className="underline underline-offset-4" href="/settings/users">Manage users &amp; roles</Link></p>
              <p><Link className="underline underline-offset-4" href="/site-content">Edit public site content</Link></p>
              <p><Link className="underline underline-offset-4" href="/handoff">Role handoff docs</Link></p>
              <p className="text-muted-foreground pt-2">Written guides live in the repo under <code>docs/ADMIN_GUIDE.md</code> and <code>docs/CONVENTIONS.md</code>.</p>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="ring-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">Danger zone</CardTitle>
              <CardDescription>Use after a suspected account compromise or when rotating shared devices.</CardDescription>
            </CardHeader>
            <CardContent>
              <SignOutAllButton />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
