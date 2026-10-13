import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule, isMainAdmin } from "@/lib/auth/guards";
import { getHandoffDoc, listAdminsForSelect, canEditHandoff } from "@/lib/handoff/queries";
import { fmtDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HandoffEditor } from "@/components/admin/handoff-editor";
import { HandoffOwnerForm } from "@/components/admin/handoff-forms";

export const metadata = { title: "Handoff doc" };

export default async function HandoffDocPage(props: PageProps<"/handoff/[id]">) {
  const user = await requireModule("handoff");
  const { id } = await props.params;
  const doc = await getHandoffDoc(id);
  if (!doc) notFound();

  const mainAdmin = isMainAdmin(user);
  const canEdit = canEditHandoff(user, doc);
  const admins = mainAdmin ? await listAdminsForSelect() : [];

  return (
    <div>
      <PageHeader
        title={doc.roleTitle}
        description={`Owner: ${doc.owner ? `${doc.owner.firstName} ${doc.owner.lastName}` : "none"} · Last updated ${fmtDateTime(doc.updatedAt)}${doc.updatedBy ? ` by ${doc.updatedBy.firstName} ${doc.updatedBy.lastName}` : ""}`}
        actions={<Button asChild variant="outline"><Link href="/handoff">All docs</Link></Button>}
      />

      {mainAdmin ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <HandoffOwnerForm docId={doc.id} ownerId={doc.ownerId} admins={admins} />
          </CardContent>
        </Card>
      ) : null}

      {!canEdit ? (
        <p className="text-xs text-muted-foreground mb-3">Read-only: only the owner of this role or a Main Admin can edit it.</p>
      ) : null}

      <Card>
        <CardContent className="pt-5">
          <HandoffEditor docId={doc.id} content={doc.content ?? ""} canEdit={canEdit} />
        </CardContent>
      </Card>
    </div>
  );
}
