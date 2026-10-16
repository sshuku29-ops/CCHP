import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toDateInput, fmtDate } from "@/lib/dates";
import { cycleStatus, deadlineSentence, hasPendingOpenDate, type CycleWindow } from "@/lib/recruitment/helpers";
import { CycleStatusPill } from "@/components/recruitment/cycle-status-pill";
import { CopyLinkButton } from "@/components/recruitment/copy-link-button";
import { CycleDeadlineForm } from "@/components/recruitment/cycle-deadline-form";

type Cycle = CycleWindow & { id: string; slug: string };

/**
 * The status panel under the cycle title: big status pill, the public link
 * with a copy button, the inline deadline form and the manual open/close
 * buttons. Shared by every tab of the cycle page.
 */
export function CycleStatusPanel({ cycle }: { cycle: Cycle }) {
  const status = cycleStatus(cycle);
  const path = `/apply/${encodeURIComponent(cycle.slug)}`;

  return (
    <Card className="mb-6">
      <CardContent className="space-y-4 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CycleStatusPill cycle={cycle} size="lg" />
            <p className="text-sm text-muted-foreground">{deadlineSentence(cycle.closesAt)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <code className="rounded bg-muted px-2 py-1 text-xs">{path}</code>
            <CopyLinkButton path={path} />
            <Button asChild size="sm" variant="ghost">
              <Link href={path} target="_blank">
                View
              </Link>
            </Button>
          </div>
        </div>

        {status.kind === "DEADLINE_PASSED" ? (
          <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <AlertTitle>Deadline passed</AlertTitle>
            <AlertDescription className="text-amber-900/90 dark:text-amber-200">
              The closing date ({fmtDate(status.closesAt)}) has gone by, so applicants see a closed notice even though the manual
              switch is still on. Extend the date below, tick &ldquo;leave open&rdquo;, or close the cycle.
            </AlertDescription>
          </Alert>
        ) : null}

        {hasPendingOpenDate(cycle) && cycle.opensAt ? (
          <p className="text-sm text-muted-foreground">
            An opening date is set ({fmtDate(cycle.opensAt)}) but the manual switch is <strong>off</strong>, so nothing will open on
            its own. Press &ldquo;Open applications now&rdquo; and the form will go live on that date.
          </p>
        ) : null}

        <CycleDeadlineForm cycleId={cycle.id} isOpen={cycle.isOpen} opensAt={toDateInput(cycle.opensAt)} closesAt={toDateInput(cycle.closesAt)} />

        <p className="text-xs text-muted-foreground">
          How this works: the manual switch must be ON for the form to accept applications; the dates only narrow that window
          (nothing before &ldquo;Opens on&rdquo;, nothing after 11:59 pm on &ldquo;Closes on&rdquo;).
        </p>
      </CardContent>
    </Card>
  );
}
