import Link from "next/link";
import { requireModule, isMainAdmin } from "@/lib/auth/guards";
import { listHandoffDocs, listAdminsForSelect } from "@/lib/handoff/queries";
import { fmtDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HandoffCreateForm } from "@/components/admin/handoff-forms";

export const metadata = { title: "Handoff docs" };

export default async function HandoffListPage() {
  const user = await requireModule("handoff");
  const mainAdmin = isMainAdmin(user);
  const [docs, admins] = await Promise.all([listHandoffDocs(), mainAdmin ? listAdminsForSelect() : Promise.resolve([])]);

  return (
    <div>
      <PageHeader
        title="Role handoff docs"
        description="One living document per leadership role. Each owner keeps theirs current so the next person can pick up where they left off."
      />

      <Card className="mb-6">
        <CardContent className="pt-1">
          {docs.length === 0 ? (
            <EmptyState title="No handoff docs yet" description="Run the seed script or create one below." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Last updated</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        <Link href={`/handoff/${d.id}`} className="hover:underline underline-offset-4">{d.roleTitle}</Link>
                        {d.ownerId === user.id ? <Badge variant="secondary" className="ml-2">Yours</Badge> : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{d.owner ? `${d.owner.firstName} ${d.owner.lastName}` : "No owner"}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {fmtDateTime(d.updatedAt)}
                        {d.updatedBy ? <span className="block text-xs">by {d.updatedBy.firstName} {d.updatedBy.lastName}</span> : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost"><Link href={`/handoff/${d.id}`}>Open</Link></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {mainAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>New role doc</CardTitle>
            <CardDescription>For a role that is not in the standard leadership list.</CardDescription>
          </CardHeader>
          <CardContent>
            <HandoffCreateForm admins={admins} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
