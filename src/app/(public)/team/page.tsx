import { Editable } from "@/components/cms/editable";
import { InitialsAvatar } from "@/components/public/initials-avatar";
import { PageTitle, Section, SectionHeading } from "@/components/public/section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canEditContent } from "@/lib/cms/content";
import { getLeadershipProfiles, getOptInVolunteers } from "@/lib/public/queries";

export const metadata = {
  title: "Team",
  description: "The Colby College students who lead CCHP, and the volunteers who chose to be listed.",
};

export default async function TeamPage() {
  const [leaders, volunteers, canEdit] = await Promise.all([getLeadershipProfiles(), getOptInVolunteers(), canEditContent()]);

  return (
    <>
      <Section className="pb-4 md:pb-6">
        <PageTitle titleKey="team.heading" introKey="team.intro" />
      </Section>

      {/* Leadership grid */}
      <Section ariaLabelledBy="leaders-title">
        <SectionHeading headingKey="team.leadership.heading" id="leaders-title" manageHref="/site-content?tab=leadership" canEdit={canEdit} />
        {leaders.length === 0 ? (
          <Editable k="team.leadership.empty" as="p" className="text-muted-foreground" />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leaders.map((p) => (
              <li key={p.id} className="rounded-lg border bg-card p-5">
                <InitialsAvatar firstName={p.firstName} lastName={p.lastName} photoUrl={p.photoUrl} size="lg" />
                <p className="mt-4 font-heading text-lg font-semibold">
                  {p.firstName} {p.lastName}
                </p>
                {p.leadershipTitle ? <p className="text-sm font-medium text-primary">{p.leadershipTitle}</p> : null}
                {p.bio ? <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.bio}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Opt-in volunteers: alphabetical, never ranked */}
      <Section className="border-t" ariaLabelledBy="volunteers-title">
        <SectionHeading headingKey="team.volunteers.heading" introKey="team.volunteers.note" id="volunteers-title" manageHref="/site-content?tab=optins" canEdit={canEdit} />
        {volunteers.length === 0 ? (
          <Editable k="team.volunteers.empty" as="p" className="text-muted-foreground" />
        ) : (
          <div className="max-w-xl rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Editable k="team.volunteers.col.name" as="span" />
                  </TableHead>
                  <TableHead className="text-right">
                    <Editable k="team.volunteers.col.hours" as="span" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {volunteers.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      {v.firstName} {v.lastName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{v.hours.toLocaleString("en-US")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </>
  );
}
