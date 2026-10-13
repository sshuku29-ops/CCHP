"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { updateCycleAction } from "@/lib/recruitment/actions";
import { VIDEO_REVIEW_MODE_HELP, VIDEO_REVIEW_MODE_LABELS, type FormResult } from "@/lib/recruitment/helpers";
import { CYCLE_TYPES, CYCLE_TYPE_LABELS, VIDEO_REVIEW_MODES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/native-select";
import { FieldError } from "@/components/shared/field-error";

type Cycle = {
  id: string;
  name: string;
  type: string;
  slug: string;
  description: string | null;
  opensAt: string; // yyyy-mm-dd or ""
  closesAt: string;
  videoReviewMode: string;
};

/** Edit the cycle's basic fields (Settings tab). */
export function CycleSettingsForm({ cycle }: { cycle: Cycle }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(updateCycleAction, null);
  const v = state?.values ?? {};
  const err = state?.fieldErrors ?? {};
  const [mode, setMode] = useState(cycle.videoReviewMode);

  useEffect(() => {
    if (state?.ok) toast.success(state.message ?? "Saved.");
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="cycleId" value={cycle.id} />
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={v.name ?? cycle.name} aria-invalid={!!err.name} />
        <FieldError msg={err.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slug">Public link slug</Label>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">/apply/</span>
          <Input id="slug" name="slug" required defaultValue={v.slug ?? cycle.slug} aria-invalid={!!err.slug} />
        </div>
        <p className="text-xs text-muted-foreground">Changing this breaks any link you already shared.</p>
        <FieldError msg={err.slug} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="type">Application type</Label>
          <NativeSelect id="type" name="type" defaultValue={v.type ?? cycle.type}>
            {CYCLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {CYCLE_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
          <FieldError msg={err.type} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="videoReviewMode">Video review mode</Label>
          <NativeSelect id="videoReviewMode" name="videoReviewMode" value={mode} onChange={(e) => setMode(e.target.value)}>
            {VIDEO_REVIEW_MODES.map((m) => (
              <option key={m} value={m}>
                {VIDEO_REVIEW_MODE_LABELS[m]}
              </option>
            ))}
          </NativeSelect>
          <FieldError msg={err.videoReviewMode} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{VIDEO_REVIEW_MODE_HELP[mode as keyof typeof VIDEO_REVIEW_MODE_HELP] ?? ""}</p>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description (shown to applicants)</Label>
        <Textarea id="description" name="description" rows={4} defaultValue={v.description ?? cycle.description ?? ""} />
        <FieldError msg={err.description} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="opensAt">Opens on (optional)</Label>
          <Input id="opensAt" name="opensAt" type="date" defaultValue={v.opensAt ?? cycle.opensAt} />
          <FieldError msg={err.opensAt} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="closesAt">Closes on (optional, inclusive)</Label>
          <Input id="closesAt" name="closesAt" type="date" defaultValue={v.closesAt ?? cycle.closesAt} />
          <FieldError msg={err.closesAt} />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
