import { Download } from "lucide-react";
import { listMyCertificates } from "@/lib/certificates/queries";
import { documentUrl } from "@/lib/documents";
import { fmtDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** "My certificates" card on /hours: the signed-in person's own certificates with download links. */
export async function MyCertificates({ userId }: { userId: string }) {
  const certs = await listMyCertificates(userId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>My certificates</CardTitle>
        <CardDescription>Certificates of volunteer service issued to you, one per term.</CardDescription>
      </CardHeader>
      <CardContent>
        {certs.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet. Certificates are issued by leadership at the end of each term.</p>
        ) : (
          <ul className="divide-y">
            {certs.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.term}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.hours} hours · {c.sessionsCount} session{c.sessionsCount === 1 ? "" : "s"} · issued {fmtDate(c.issuedAt)}
                    {c.issuedBy ? ` by ${c.issuedBy.firstName} ${c.issuedBy.lastName}` : ""}
                  </p>
                </div>
                {c.document ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={`${documentUrl(c.document)}?download=1`}>
                      <Download /> Download PDF
                    </a>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">File missing — ask leadership to regenerate.</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
