import { requireUser, isAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <div>
      <PageHeader title={`Welcome, ${user.firstName}`} description={isAdmin(user) ? "Team dashboard" : "Your tasks, training, and hours"} />
      <p className="text-sm text-muted-foreground">Dashboard content is being built.</p>
    </div>
  );
}
