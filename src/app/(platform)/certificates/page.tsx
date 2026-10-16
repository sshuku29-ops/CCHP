import { Download } from "lucide-react";
import { requireModule } from "@/lib/auth/guards";
import {
  canIssueCertificates,
  listCertificateTerms,
  listTermVolunteers,
  listUsersForCertificates,
} from "@/lib/certificates/queries";
import { generateAllMissing, generateCertificate } from "@/lib/certificates/actions";
import { documentUrl } from "@/lib/documents";
import { fmtDate } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { NativeSelect } from "@/components/shared/native-select";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GenerateButton } from "@/components/certificates/generate-button";
import { ManualCertificateForm } from "@/components/certificates/manual-certificate-form";

export const metadata = { title: "Certificates" };

/**
 * /certificates?term=Fall 2026 — volunteers with hours in the term and their
 * certificate status. Admins with "volunteers" can view; only the Main Admin
 * or the Executive Director see the Generate buttons (and the actions check too).
 * Rows are sorted by name — never by hours (no leaderboards).
 */
export default async function CertificatesPage(props: PageProps<"/certificates">) {
  const user = await requireModule("volunteers");
  const issuer = canIssueCertificates(user);
  const sp = await props.searchParams;
  const terms = await listCertificateTerms();
  const requested = typeof sp.term === "string" ? sp.term : "";
  const term = terms.includes(requested) ? requested : terms[0];
  const [rows, users] = await Promise.all([listTermVolunteers(term), issuer ? listUsersForCertificates() : Promise.resolve([])]);
  const missing = rows.filter((r) => !r.certificate && r.hours > 0).length;
  const issued = rows.filter((r) => r.certificate).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificates"
        description="Certificates of volunteer service, one per volunteer per term. Each PDF states hours, sessions and the term, signed by the Executive Director."
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={`/api/export/certificates?term=${encodeURIComponent(term)}`}>
              <Download /> Export CSV
            </a>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <form method="get" className="flex items-center gap-2">
          <NativeSelect name="term" defaultValue={term} aria-label="Term" className="w-44">
            {terms.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit" size="sm" variant="secondary">
            Show term
          </Button>
        </form>
        <p className="text-sm text-muted-foreground">
          {rows.length} volunteer{rows.length === 1 ? "" : "s"} · {issued} issued · {missing} missing
        </p>
        {issuer && missing > 0 ? (
          <GenerateButton
            size="sm"
            className="ml-auto"
            action={generateAllMissing.bind(null, term)}
            confirm={`Generate ${missing} certificate${missing === 1 ? "" : "s"} for ${term}? Each volunteer gets a notification.`}
          >
            Generate all missing ({missing})
          </GenerateButton>
        ) : null}
      </div>

      {!issuer ? (
        <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
          Only the Main Admin or the Executive Director can issue certificates. You can review and export this list.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title={`No hours logged in ${term}`} description="Volunteers appear here once hours are logged for the term." />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Volunteer</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead>Certificate</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const c = r.certificate;
                // Flag a certificate whose stated hours no longer match the log (e.g. hours added later).
                const stale = c && !c.manual && (c.hours !== r.hours || c.sessionsCount !== r.sessionsCount);
                return (
                  <TableRow key={r.userId}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <UserAvatar user={r} size="xs" />
                        {r.lastName}, {r.firstName}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.hours}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.sessionsCount}</TableCell>
                    <TableCell className="whitespace-normal">
                      {c ? (
                        <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
                          <Badge variant="secondary" className="border-transparent bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
                            Issued {fmtDate(c.issuedAt)}
                          </Badge>
                          {c.manual ? <Badge variant="outline">Manual · {c.hours} h</Badge> : null}
                          {stale ? <Badge variant="outline" className="border-amber-300 text-amber-900 dark:text-amber-100">Says {c.hours} h · {c.sessionsCount} sessions</Badge> : null}
                          {c.document ? (
                            <a href={documentUrl(c.document)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                              Open PDF
                            </a>
                          ) : (
                            <span className="text-muted-foreground">file missing</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not issued</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {issuer && r.hours > 0 ? (
                        <GenerateButton
                          size="sm"
                          variant={c ? "ghost" : "outline"}
                          action={generateCertificate.bind(null, r.userId, term)}
                          confirm={c ? `Regenerate ${r.firstName}'s ${term} certificate? The old PDF is replaced.` : undefined}
                        >
                          {c ? "Regenerate" : "Generate"}
                        </GenerateButton>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {issuer ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Manual certificate</CardTitle>
            <CardDescription>For hours that aren&apos;t in the log (an older term, a partner volunteer). Replaces any existing certificate for that person and term.</CardDescription>
          </CardHeader>
          <CardContent>
            <ManualCertificateForm users={users} terms={terms} defaultTerm={term} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
