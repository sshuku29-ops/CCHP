"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { publishReportAction, unpublishReportAction } from "@/lib/reports/actions";

/** Publish / Unpublish for one report. Publishing snapshots the live metrics. */
export function ReportPublishButtons({ year, status }: { year: number; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (status === "PUBLISHED") {
    return (
      <ConfirmButton
        variant="outline"
        message="Unpublish this report? It will disappear from the public site until you publish again."
        action={() => unpublishReportAction(year)}
        onDone={() => {
          toast.success("Report unpublished.");
          router.refresh();
        }}
      >
        Unpublish
      </ConfirmButton>
    );
  }
  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await publishReportAction(year);
          if (res?.error) toast.error(res.error);
          else {
            toast.success("Published. Metrics were snapshotted.");
            router.refresh();
          }
        })
      }
    >
      {pending ? "Publishing…" : "Publish"}
    </Button>
  );
}
