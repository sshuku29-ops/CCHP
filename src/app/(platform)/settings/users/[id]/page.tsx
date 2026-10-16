import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMainAdmin } from "@/lib/auth/guards";
import { getUserForEdit } from "@/lib/admin/queries";
import { ROLE_LABELS, MODULES, type Role, type ModuleKey } from "@/lib/constants";
import { fmtDateTime } from "@/lib/dates";
import { safeJsonParse } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserProfileForm, UserRoleForm, ModuleScopeForm, UserDangerZone, type EditableUser } from "@/components/admin/user-edit-forms";

export const metadata = { title: "Edit user" };

export default async function EditUserPage(props: PageProps<"/settings/users/[id]">) {
  const me = await requireMainAdmin();
  const { id } = await props.params;
  const user = await getUserForEdit(id);
  if (!user) notFound();

  const isSelf = user.id === me.id;
  const c = user._count;
  const canDelete = c.hoursLogs === 0 && c.submissions === 0 && c.sessionParticipation === 0;
  const editable: EditableUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    allowedModules: user.allowedModules,
    firstName: user.firstName,
    lastName: user.lastName,
    leadershipTitle: user.leadershipTitle,
    isActive: user.isActive,
    canDelete,
    historyNote: `This account has ${c.hoursLogs} hours logs, ${c.submissions} submissions and ${c.sessionParticipation} session records.`,
  };
  // allowedModules is a JSON array of module keys, or null for "all".
  const scoped = safeJsonParse<string[] | null>(user.allowedModules, null);
  const currentModules: ModuleKey[] | null = scoped ? MODULES.filter((m) => scoped.includes(m)) : null;

  return (
    <div>
      <PageHeader
        title={`${user.firstName} ${user.lastName}`}
        description={`@${user.username} · ${ROLE_LABELS[user.role as Role] ?? user.role}${user.leadershipTitle ? ` · ${user.leadershipTitle}` : ""}`}
        actions={<Button asChild variant="outline"><Link href="/settings/users">Back to users</Link></Button>}
      />

      <div className="flex flex-wrap gap-2 mb-6 text-sm">
        {user.isActive ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
        {user.mustChangePassword ? <Badge variant="outline" className="border-amber-300 text-amber-900">Must change password</Badge> : null}
        <span className="text-muted-foreground">Last login: {fmtDateTime(user.lastLoginAt)}</span>
        <span className="text-muted-foreground">Created: {fmtDateTime(user.createdAt)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <UserProfileForm user={editable} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Role</CardTitle>
              <CardDescription>Volunteer → own tasks, training, hours. Admin → management platform. Main Admin → everything plus users and settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserRoleForm user={editable} isSelf={isSelf} />
            </CardContent>
          </Card>

          {user.role === "ADMIN" ? (
            <Card>
              <CardHeader>
                <CardTitle>Module access</CardTitle>
                <CardDescription>Limit which parts of the platform this Admin can open. Main Admins always see everything.</CardDescription>
              </CardHeader>
              <CardContent>
                <ModuleScopeForm user={editable} current={currentModules} />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="lg:col-span-2 ring-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Account actions</CardTitle>
            <CardDescription>Resetting a password or deactivating signs the person out of every device.</CardDescription>
          </CardHeader>
          <CardContent>
            <UserDangerZone user={editable} isSelf={isSelf} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
