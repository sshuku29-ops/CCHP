"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { FieldError } from "@/components/shared/field-error";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toDateInput } from "@/lib/dates";
import { logInformalSession } from "@/lib/informal/actions";

type PickerUser = { id: string; firstName: string; lastName: string; role: string };

/** Quick form for logging an informal session (game night, walk-in help, etc.). */
export function InformalSessionForm({ users }: { users: PickerUser[] }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const visible = needle ? users.filter((u) => `${u.firstName} ${u.lastName}`.toLowerCase().includes(needle)) : users;
  return (
    <ActionForm action={logInformalSession} className="space-y-4">
      {(state) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="inf-date">Date</Label>
              <Input id="inf-date" name="date" type="date" required defaultValue={toDateInput(new Date())} />
              <FieldError msg={state?.fieldErrors?.date} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inf-hours">Hours per volunteer</Label>
              <Input id="inf-hours" name="hours" type="number" min={0.25} max={24} step={0.25} required defaultValue="1.5" />
              <p className="text-xs text-muted-foreground">Logged for each selected volunteer.</p>
              <FieldError msg={state?.fieldErrors?.hours} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inf-title">Title</Label>
            <Input id="inf-title" name="title" required maxLength={200} placeholder="e.g. Board games & conversation" />
            <FieldError msg={state?.fieldErrors?.title} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inf-activities">Activities</Label>
            <Textarea id="inf-activities" name="activities" rows={3} maxLength={5000} placeholder="What did you do together?" />
            <FieldError msg={state?.fieldErrors?.activities} />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Volunteers present</legend>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a name…" aria-label="Find a name" className="h-8 sm:max-w-xs" />
            <div className="grid max-h-56 grid-cols-1 gap-x-4 gap-y-1 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm" hidden={!visible.includes(u)}>
                  <input type="checkbox" name="volunteerIds" value={u.id} className="size-4 rounded border-input accent-primary" />
                  <span className="truncate">
                    {u.firstName} {u.lastName}
                  </span>
                  {u.role !== "VOLUNTEER" ? <span className="text-xs text-muted-foreground">leader</span> : null}
                </label>
              ))}
            </div>
            <FieldError msg={state?.fieldErrors?.volunteerIds} />
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="inf-others">Other volunteers (count)</Label>
              <Input id="inf-others" name="volunteerCount" type="number" min={0} max={500} step={1} defaultValue="0" />
              <p className="text-xs text-muted-foreground">People without an account.</p>
              <FieldError msg={state?.fieldErrors?.volunteerCount} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inf-residents">Residents (count)</Label>
              <Input id="inf-residents" name="participantCount" type="number" min={0} max={10000} step={1} defaultValue="0" />
              <p className="text-xs text-muted-foreground">A number only — never names.</p>
              <FieldError msg={state?.fieldErrors?.participantCount} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inf-location">Location (optional)</Label>
              <Input id="inf-location" name="location" maxLength={200} placeholder="Shelter common room" />
              <FieldError msg={state?.fieldErrors?.location} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inf-notes">Notes (optional)</Label>
            <Textarea id="inf-notes" name="notes" rows={3} maxLength={5000} />
            <FieldError msg={state?.fieldErrors?.notes} />
          </div>

          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <SubmitButton pendingText="Saving…">Log session</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
