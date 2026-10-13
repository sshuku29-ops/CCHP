import Link from "next/link";
import { requireModule } from "@/lib/auth/guards";
import { listUsersForPicker } from "@/lib/records/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SessionForm } from "@/components/records/session-form";

export const metadata = { title: "New session" };

export default async function NewSessionPage() {
  await requireModule("records");
  const users = await listUsersForPicker();
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="New session record"
        description="Term and academic year are filled in automatically from the date."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/sessions">Cancel</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <SessionForm users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
