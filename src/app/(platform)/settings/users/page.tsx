import Link from "next/link";
import { requireMainAdmin } from "@/lib/auth/guards";
import { listUsers } from "@/lib/admin/queries";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { fmtDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateUserForm } from "@/components/admin/create-user-form";

export const metadata = { title: "Users & roles" };

export default async function UsersPage() {
  const me = await requireMainAdmin();
  const users = await listUsers();

  return (
    <div>
      <PageHeader
        title="Users & roles"
        description="Accounts are created here by the Main Admin — there is no self-registration."
        actions={
          <>
            <Button asChild variant="outline"><a href="/api/export/users">Export CSV</a></Button>
            <Button asChild><a href="#create">Create user</a></Button>
          </>
        }
      />

      <Card className="mb-6">
        <CardContent className="pt-1">
          {users.length === 0 ? (
            <EmptyState title="No users yet" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Leadership title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last login</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className={u.isActive ? "" : "opacity-60"}>
                      <TableCell className="font-medium whitespace-nowrap">
                        <Link href={`/settings/users/${u.id}`} className="hover:underline underline-offset-4">
                          {u.firstName} {u.lastName}
                        </Link>
                        {u.id === me.id ? <span className="ml-1 text-xs text-muted-foreground">(you)</span> : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">@{u.username}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                      <TableCell><Badge variant={u.role === "VOLUNTEER" ? "secondary" : "default"}>{ROLE_LABELS[u.role as Role] ?? u.role}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{u.leadershipTitle ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.isActive ? null : <Badge variant="outline">Inactive</Badge>}
                          {u.mustChangePassword ? <Badge variant="outline" className="border-amber-300 text-amber-900">Must change password</Badge> : null}
                          {u.isActive && !u.mustChangePassword ? <span className="text-xs text-muted-foreground">Active</span> : null}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDateTime(u.lastLoginAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost"><Link href={`/settings/users/${u.id}`}>Edit</Link></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="create">
        <CardHeader>
          <CardTitle>Create user</CardTitle>
          <CardDescription>
            Volunteers see only their own tasks, training, and hours. Admins see the management platform; Main Admins can also manage users and settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>
    </div>
  );
}
