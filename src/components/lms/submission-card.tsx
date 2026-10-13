import Link from "next/link";
import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { YouTubeEmbed } from "@/components/shared/youtube-embed";
import { fmtDateTime } from "@/lib/dates";
import { fullName } from "@/lib/utils";
import type { SubmissionRow } from "@/lib/lms/queries";
import { ReviewForm } from "./review-form";

/**
 * One submission in a history list. Shows the content (text / video / file),
 * status, feedback and reviewer. With `review` the admin review form is included.
 * Server component (ReviewForm inside is the only client piece).
 */
export function SubmissionCard({ submission, showAuthor, review }: { submission: SubmissionRow; showAuthor?: boolean; review?: boolean }) {
  const s = submission;
  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            {showAuthor ? <span className="font-medium">{fullName(s.user)} · </span> : null}
            <span className="text-muted-foreground">Submitted {fmtDateTime(s.submittedAt)}</span>
          </div>
          <StatusBadge status={s.status} />
        </div>

        {s.text ? <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted/50 p-3">{s.text}</p> : null}
        {s.videoUrl ? (
          <div className="max-w-xl">
            <YouTubeEmbed url={s.videoUrl} title="Submitted video" />
          </div>
        ) : null}
        {s.fileKey && s.fileName ? (
          <Link href={`/api/files/${encodeURIComponent(s.fileKey)}`} className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4">
            <Download className="size-4" />
            {s.fileName}
            {s.fileSize ? <span className="text-muted-foreground">({Math.max(1, Math.round(s.fileSize / 1024))} KB)</span> : null}
          </Link>
        ) : null}

        {s.status !== "SUBMITTED" ? (
          <div className="rounded-lg border p-3 text-sm space-y-1">
            <p className="text-xs text-muted-foreground">
              {s.status === "REVIEWED" ? "Reviewed" : "Revision requested"}
              {s.reviewedBy ? ` by ${fullName(s.reviewedBy)}` : ""}
              {s.reviewedAt ? ` · ${fmtDateTime(s.reviewedAt)}` : ""}
            </p>
            {s.feedback ? <p className="whitespace-pre-wrap">{s.feedback}</p> : <p className="text-muted-foreground">No written feedback.</p>}
          </div>
        ) : null}

        {review ? (
          <div className="border-t pt-3">
            <ReviewForm submission={{ id: s.id, status: s.status, feedback: s.feedback }} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
