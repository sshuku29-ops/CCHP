import Link from "next/link";
import { requireModule } from "@/lib/auth/guards";
import { listUsersForPicker } from "@/lib/records/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InformalSessionForm } from "./informal-form";

export const metadata = { title: "Log an informal session" };

/** /sessions/informal/new — quick-log for informal sessions. Admins with "records" only. */
export default async function NewInformalSessionPage() {
  await requireModule("records");
  const users = await listUsersForPicker();
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Log an informal session"
        description="One form records the session, who was there, and their hours. Term and year come from the date."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/sessions">Cancel</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <InformalSessionForm users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
