"use client";

import { useActionState } from "react";
import { createCycleAction } from "@/lib/recruitment/actions";
import { VIDEO_REVIEW_MODE_HELP, VIDEO_REVIEW_MODE_LABELS, slugify, type FormResult } from "@/lib/recruitment/helpers";
import { CYCLE_TYPES, CYCLE_TYPE_LABELS, VIDEO_REVIEW_MODES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/native-select";
import { FieldError } from "@/components/shared/field-error";
import { useState } from "react";

/** "New cycle" form. The slug is generated from the name on the server (made unique). */
export function NewCycleForm() {
  const [state, action, pending] = useActionState<FormResult, FormData>(createCycleAction, null);
  const v = state?.values ?? {};
  const err = state?.fieldErrors ?? {};
  const [name, setName] = useState(v.name ?? "");
  const [mode, setMode] = useState(v.videoReviewMode ?? "AFTER");

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required placeholder="Volunteer applications — Spring 2026" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!err.name} />
        <p className="text-xs text-muted-foreground">
          Public link: <code>/apply/{slugify(name || "…")}</code> (a number is added if the slug is taken)
        </p>
        <FieldError msg={err.name} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="type">Application type</Label>
          <NativeSelect id="type" name="type" defaultValue={v.type ?? "VOLUNTEER"}>
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
        <Textarea id="description" name="description" rows={3} defaultValue={v.description ?? ""} placeholder="What the role involves, time commitment, when decisions go out…" />
        <FieldError msg={err.description} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="opensAt">Opens on (optional)</Label>
          <Input id="opensAt" name="opensAt" type="date" defaultValue={v.opensAt ?? ""} />
          <FieldError msg={err.opensAt} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="closesAt">Closes on (optional, inclusive)</Label>
          <Input id="closesAt" name="closesAt" type="date" defaultValue={v.closesAt ?? ""} />
          <FieldError msg={err.closesAt} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        New cycles start <strong>closed</strong> and with a default rubric (Motivation, Communication, Reliability). Add your questions,
        then open it from the cycles table.
      </p>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create cycle"}
      </Button>
    </form>
  );
}
