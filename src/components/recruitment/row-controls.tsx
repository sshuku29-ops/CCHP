"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setApplicationFlagAction, setApplicationStatusAction } from "@/lib/recruitment/actions";
import { APPLICATION_STATUS_LABELS } from "@/lib/recruitment/helpers";
import { APPLICATION_STATUSES } from "@/lib/constants";
import { NativeSelect } from "@/components/shared/native-select";

/** Status dropdown for one row of the ranked list. Saves on change. */
export function StatusSelect({ applicationId, status }: { applicationId: string; status: string }) {
  const [pending, start] = useTransition();
  return (
    <NativeSelect
      aria-label="Status"
      className="w-36"
      defaultValue={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        start(async () => {
          const res = await setApplicationStatusAction(applicationId, next);
          if (res?.error) toast.error(res.error);
        });
      }}
    >
      {APPLICATION_STATUSES.map((s) => (
        <option key={s} value={s}>
          {APPLICATION_STATUS_LABELS[s]}
        </option>
      ))}
    </NativeSelect>
  );
}

/** "Flag for interview" checkbox for one row. Saves on change. */
export function FlagCheckbox({ applicationId, flagged }: { applicationId: string; flagged: boolean }) {
  const [pending, start] = useTransition();
  return (
    <input
      type="checkbox"
      aria-label="Flag for interview"
      className="size-4 accent-primary"
      defaultChecked={flagged}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.checked;
        start(async () => {
          const res = await setApplicationFlagAction(applicationId, next);
          if (res?.error) toast.error(res.error);
        });
      }}
    />
  );
}
