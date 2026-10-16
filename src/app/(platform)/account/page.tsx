import Link from "next/link";
import { requireUser, isAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountForm } from "./form";
import { PhotoForm } from "./photo-form";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const session = await requireUser();
  // The session only carries a few fields; load the full profile for the form.
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.id },
    select: {
      username: true,
      role: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      graduationDate: true,
      hasVehicle: true,
      publicHoursOptIn: true,
      leadershipTitle: true,
      bio: true,
      showOnPublicSite: true,
      photoKey: true,
      pronouns: true,
      major: true,
      profileBody: true,
      smsOptIn: true,
    },
  });
  const admin = isAdmin(session);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="My account"
        description="Update your photo, contact details and what is shown about you publicly."
        actions={<Button variant="outline" size="sm" asChild><Link href="/change-password">Change password</Link></Button>}
      />

      <Card className="mb-6">
        <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Username</p>
            <p className="font-medium">{user.username}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</p>
            <p className="font-medium">{ROLE_LABELS[user.role as Role] ?? user.role}</p>
          </div>
          <p className="sm:col-span-2 text-xs text-muted-foreground">Username and role can only be changed by the Main Admin.</p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Photo</CardTitle>
          <CardDescription>Shown next to your name across the platform so your team recognizes you.</CardDescription>
        </CardHeader>
        <CardContent>
          <PhotoForm user={{ firstName: user.firstName, lastName: user.lastName, photoKey: user.photoKey }} />
        </CardContent>
      </Card>

      <AccountForm
        admin={admin}
        initial={{
          email: user.email ?? "",
          phone: user.phone ?? "",
          graduationDate: toDateInput(user.graduationDate),
          hasVehicle: user.hasVehicle,
          publicHoursOptIn: user.publicHoursOptIn,
          pronouns: user.pronouns ?? "",
          major: user.major ?? "",
          profileBody: user.profileBody ?? "",
          smsOptIn: user.smsOptIn,
          leadershipTitle: user.leadershipTitle ?? "",
          bio: user.bio ?? "",
          showOnPublicSite: user.showOnPublicSite,
        }}
      />
    </div>
  );
}
