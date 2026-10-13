import Link from "next/link";
import { requireModule } from "@/lib/auth/guards";
import { HOURS_COLUMNS, SESSION_COLUMNS, VOLUNTEER_COLUMNS } from "@/lib/records/import";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportForm } from "@/components/records/import-form";

export const metadata = { title: "Import CSV" };

/** Three one-time importers for migrating from the old Google Sheets. Full guide: docs/MIGRATION.md */
export default async function ImportPage() {
  await requireModule("volunteers");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Import from CSV"
        description="Move the old Google Sheets into the platform. Run a dry run first; nothing is saved until you untick it. Step-by-step instructions live in docs/MIGRATION.md."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/volunteers">Back to directory</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>1. Volunteer list</CardTitle>
          <CardDescription>
            Creates a Volunteer account per row with a temporary password (shown once below) that must be changed at first
            sign-in. Username is first.last. Rows whose email already has an account are skipped. Dates: YYYY-MM-DD or
            M/D/YYYY. has_vehicle: yes / no.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportForm kind="volunteers" sampleHeader={VOLUNTEER_COLUMNS.join(",")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Hours log (weekly form responses)</CardTitle>
          <CardDescription>
            One row per hours entry, matched to an account by email — import the volunteer list first. type: formal,
            informal, prep or other. Rows with an unknown email are skipped and listed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportForm kind="hours" sampleHeader={HOURS_COLUMNS.join(",")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Record keeping sheet (sessions)</CardTitle>
          <CardDescription>
            One row per session. type: FORMAL or INFORMAL. participants is a number only — never resident names.
            volunteer_emails separated by “;”. materials as label|url;label|url. Term and academic year are worked out
            from the date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportForm kind="sessions" sampleHeader={SESSION_COLUMNS.join(",")} />
        </CardContent>
      </Card>
    </div>
  );
}
