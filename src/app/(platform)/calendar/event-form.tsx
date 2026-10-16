"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createEventAction, updateEventAction } from "@/lib/calendar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/native-select";
import { FieldError } from "@/components/shared/field-error";
import { EVENT_TYPES } from "@/lib/constants";

export type EventFormValues = {
  id?: string;
  title: string;
  type: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm or ""
  endDate: string;
  endTime: string;
  location: string;
  description: string;
};

/** Admin form to add or edit a calendar event. */
export function EventForm({ initial, month }: { initial?: EventFormValues; month: string }) {
  const action = initial?.id ? updateEventAction.bind(null, initial.id) : createEventAction;
  const [state, formAction, pending] = useActionState(action, null);
  const v = initial;
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={v?.title} required maxLength={150} />
        <FieldError msg={state?.fieldErrors?.title} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="type">Type</Label>
        <NativeSelect id="type" name="type" defaultValue={v?.type ?? "MEETING"}>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
          ))}
        </NativeSelect>
        <FieldError msg={state?.fieldErrors?.type} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" defaultValue={v?.location} maxLength={200} />
        <FieldError msg={state?.fieldErrors?.location} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="startDate">Starts</Label>
        <div className="flex gap-2">
          <Input id="startDate" name="startDate" type="date" defaultValue={v?.startDate ?? `${month}-01`} required />
          <Input name="startTime" type="time" defaultValue={v?.startTime} aria-label="Start time" className="w-32" />
        </div>
        <FieldError msg={state?.fieldErrors?.startDate ?? state?.fieldErrors?.startTime} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="endDate">Ends (optional)</Label>
        <div className="flex gap-2">
          <Input id="endDate" name="endDate" type="date" defaultValue={v?.endDate} />
          <Input name="endTime" type="time" defaultValue={v?.endTime} aria-label="End time" className="w-32" />
        </div>
        <FieldError msg={state?.fieldErrors?.endDate ?? state?.fieldErrors?.endTime} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={v?.description} rows={3} maxLength={2000} />
        <FieldError msg={state?.fieldErrors?.description} />
      </div>
      {state?.error ? <p className="text-sm text-destructive sm:col-span-2">{state.error}</p> : null}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : v?.id ? "Save changes" : "Add event"}</Button>
        <Button variant="outline" asChild><Link href={`/calendar?month=${month}`}>Cancel</Link></Button>
      </div>
    </form>
  );
}
