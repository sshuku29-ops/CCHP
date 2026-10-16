import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth/guards";
import { getApplicationForReview } from "@/lib/recruitment/queries";
import { affiliationLabel } from "@/lib/recruitment/helpers";
import { fmtDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { YouTubeEmbed } from "@/components/shared/youtube-embed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreForm } from "@/components/recruitment/score-form";

export const metadata = { title: "Review application" };

/**
 * Anonymized review page. `getApplicationForReview()` never selects the
 * applicant's name, email or phone, so there is nothing here to leak — even
 * when names have been revealed on the ranked list.
 */
export default async function ReviewPage(props: PageProps<"/recruitment/[cycleId]/review/[applicationId]">) {
  const user = await requireModule("recruitment");
  const { cycleId, applicationId } = await props.params;
  const app = await getApplicationForReview(applicationId, user.id);
  if (!app || app.cycle.id !== cycleId) notFound();

  // Video answers: visible while scoring (BEFORE), or only once this reviewer
  // has scored every criterion (AFTER, the default).
  const videosUnlocked = app.cycle.videoReviewMode === "BEFORE" || app.hasScoredEverything;

  return (
    <div>
      <div className="mb-2 text-sm">
        <Link href={`/recruitment/${cycleId}`} className="text-muted-foreground hover:text-foreground">
          ← Back to {app.cycle.name}
        </Link>
      </div>
      <PageHeader
        title={`Application ${app.code}`}
        description={`${app.position} of ${app.total} · submitted ${fmtDateTime(app.submittedAt)} · reviewed anonymously`}
        actions={
          <>
            <StatusBadge status={app.status} />
            {app.flaggedForInterview ? <Badge className="border-transparent bg-violet-100 text-violet-900">Flagged for interview</Badge> : null}
            {app.prevId ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/recruitment/${cycleId}/review/${app.prevId}`}>← Prev</Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled>
                ← Prev
              </Button>
            )}
            {app.nextId ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/recruitment/${cycleId}/review/${app.nextId}`}>Next →</Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled>
                Next →
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,400px)]">
        <div className="space-y-4">
          <Card>
            <CardContent className="py-4 text-sm">
              <span className="text-muted-foreground">{affiliationLabel(app.cycle.type)}:</span> <span className="font-medium">{app.affiliation ?? "—"}</span>
            </CardContent>
          </Card>

          {app.questions.map((q, i) => (
            <Card key={q.id}>
              <CardHeader>
                <CardTitle className="text-base leading-snug">
                  {i + 1}. {q.prompt}
                </CardTitle>
                {q.helpText ? <CardDescription>{q.helpText}</CardDescription> : null}
              </CardHeader>
              <CardContent>
                {!q.answer || (!q.answer.text && !q.answer.videoUrl) ? (
                  <p className="text-sm italic text-muted-foreground">No answer given.</p>
                ) : q.type === "VIDEO_LINK" && q.answer.videoUrl ? (
                  videosUnlocked ? (
                    <YouTubeEmbed url={q.answer.videoUrl} title={`Video answer ${i + 1}`} />
                  ) : (
                    <div className="rounded-lg border border-dashed bg-muted/40 p-6 text-center text-sm">
                      <p className="font-medium">Video locked until you finish scoring</p>
                      <p className="mt-1 text-muted-foreground">
                        This cycle reviews written answers first. Save a score for every criterion and the video will appear here.
                      </p>
                    </div>
                  )
                ) : (
                  <p className="whitespace-pre-line text-sm leading-relaxed">{q.answer.text}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle>Your scores</CardTitle>
            <CardDescription>Each reviewer scores independently. Other reviewers cannot see your scores or note.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreForm applicationId={app.id} criteria={app.cycle.criteria} myScores={Object.fromEntries(app.myScores)} myNote={app.myNote} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
