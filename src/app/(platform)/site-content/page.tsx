import Link from "next/link";
import { requireModule } from "@/lib/auth/guards";
import { getSiteSettings, listLeadership, listPartners, listResources, listPublicOptIns, STALE_AFTER_DAYS } from "@/lib/site-content/queries";
import { listAdminsForSelect } from "@/lib/handoff/queries";
import { fmtDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SiteSettingsForm, LeadershipProfileForm, PartnerForm, ResourceForm } from "@/components/admin/site-content-forms";

export const metadata = { title: "Public site content" };

const TABS = [
  { key: "general", label: "General" },
  { key: "leadership", label: "Leadership" },
  { key: "partners", label: "Partners" },
  { key: "resources", label: "Resources" },
  { key: "optins", label: "Volunteer opt-ins" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/**
 * Tabs are plain links (?tab=…) so the active tab survives form submissions
 * and works without client-side state.
 */
export default async function SiteContentPage(props: PageProps<"/site-content">) {
  await requireModule("site");
  const sp = await props.searchParams;
  const tab: TabKey = TABS.some((t) => t.key === sp.tab) ? (sp.tab as TabKey) : "general";

  return (
    <div>
      <PageHeader
        title="Public site content"
        description="Everything on the public website that is not computed from records: mission text, the leadership team, partners, and local resources."
      />

      <nav className="mb-6 flex flex-wrap gap-1 rounded-lg bg-muted p-1 w-fit" aria-label="Sections">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/site-content?tab=${t.key}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "general" ? <GeneralTab /> : null}
      {tab === "leadership" ? <LeadershipTab /> : null}
      {tab === "partners" ? <PartnersTab /> : null}
      {tab === "resources" ? <ResourcesTab /> : null}
      {tab === "optins" ? <OptInsTab /> : null}
    </div>
  );
}

async function GeneralTab() {
  const values = await getSiteSettings();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero &amp; contact</CardTitle>
        <CardDescription>Shown on the landing page. Changes go live immediately.</CardDescription>
      </CardHeader>
      <CardContent>
        <SiteSettingsForm values={values} />
      </CardContent>
    </Card>
  );
}

async function LeadershipTab() {
  const leaders = await listLeadership();
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Admin accounts appear here. The public site lists people in standard role order, then by name. Only profiles marked &ldquo;Show on the public site&rdquo; are visible.
      </p>
      {leaders.length === 0 ? <EmptyState title="No admin accounts" /> : null}
      {leaders.map((l) => (
        <Card key={l.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {l.firstName} {l.lastName}
              {l.showOnPublicSite ? <Badge>Public</Badge> : <Badge variant="outline">Hidden</Badge>}
            </CardTitle>
            <CardDescription>{l.leadershipTitle ?? "No title yet"}</CardDescription>
          </CardHeader>
          <CardContent>
            <LeadershipProfileForm leader={l} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function PartnersTab() {
  const partners = await listPartners();
  return (
    <div className="space-y-4">
      {partners.length === 0 ? <EmptyState title="No partners yet" description="Add the first one below." /> : null}
      {partners.map((p) => (
        <Card key={p.id}>
          <CardHeader>
            <CardTitle>{p.name}</CardTitle>
            {p.url ? <CardDescription><a href={p.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{p.url}</a></CardDescription> : null}
          </CardHeader>
          <CardContent>
            <PartnerForm partner={p} />
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader>
          <CardTitle>Add partner</CardTitle>
        </CardHeader>
        <CardContent>
          <PartnerForm />
        </CardContent>
      </Card>
    </div>
  );
}

async function ResourcesTab() {
  const [resources, admins] = await Promise.all([listResources(), listAdminsForSelect()]);
  const categories = Array.from(new Set(resources.map((r) => r.category))).sort();
  const stale = resources.filter((r) => r.isStale).length;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Each resource has an owner who re-checks it. Rows not verified in {STALE_AFTER_DAYS}+ days are highlighted
        {stale > 0 ? ` — ${stale} need${stale === 1 ? "s" : ""} a check.` : "."}
      </p>
      {resources.length === 0 ? <EmptyState title="No resources yet" description="Add the first one below." /> : null}
      {resources.map((r) => (
        <Card key={r.id} className={cn(r.isStale && "ring-amber-400 bg-amber-50/40 dark:bg-amber-900/10")}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {r.name}
              <Badge variant="secondary">{r.category}</Badge>
              {!r.isPublished ? <Badge variant="outline">Unpublished</Badge> : null}
              {r.isStale ? <Badge className="bg-amber-100 text-amber-900 border-transparent">Needs verification</Badge> : null}
            </CardTitle>
            <CardDescription>
              Owner: {r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : "none"} · Last verified: {r.lastVerifiedAt ? fmtDate(r.lastVerifiedAt) : "never"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResourceForm resource={r} admins={admins} categories={categories} />
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader>
          <CardTitle>Add resource</CardTitle>
        </CardHeader>
        <CardContent>
          <ResourceForm admins={admins} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}

async function OptInsTab() {
  const people = await listPublicOptIns();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Volunteers shown on the public site</CardTitle>
        <CardDescription>
          Names and hours appear publicly only when the volunteer opts in from their own account page. Admins cannot change this for them — ask the volunteer to update their own setting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {people.length === 0 ? (
          <EmptyState title="Nobody has opted in yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Hours logged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.firstName} {p.lastName}</TableCell>
                  <TableCell className="text-right">{p.totalHours.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
