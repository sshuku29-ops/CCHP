"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { FieldError } from "@/components/shared/field-error";
import { NativeSelect } from "@/components/shared/native-select";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSessionAction } from "@/lib/records/actions";
import { SESSION_TYPES } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";

type Material = { label: string; url: string };
type PickerUser = { id: string; firstName: string; lastName: string; role: string };

/**
 * Create / edit a session record. Term and academic year are derived from the
 * date on the server, so there is no field for them here.
 * participantCount is a NUMBER of residents — never names (spec §3).
 */
export function SessionForm({
  session,
  users,
}: {
  session?: {
    id: string;
    date: Date;
    type: string;
    topic: string | null;
    title: string | null;
    participantCount: number;
    location: string | null;
    notes: string | null;
    materials: Material[];
    volunteerIds: string[];
  };
  users: PickerUser[];
}) {
  const [materials, setMaterials] = useState<Material[]>(session?.materials.length ? session.materials : [{ label: "", url: "" }]);
  const selected = new Set(session?.volunteerIds ?? []);

  return (
    <ActionForm action={saveSessionAction} className="space-y-6">
      {(state) => (
        <>
          {session ? <input type="hidden" name="id" value={session.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" defaultValue={session ? toDateInput(session.date) : ""} required />
              <FieldError msg={state?.fieldErrors?.date} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <NativeSelect id="type" name="type" defaultValue={session?.type ?? "FORMAL"}>
                {SESSION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "FORMAL" ? "Formal session" : "Informal session"}
                  </option>
                ))}
              </NativeSelect>
              <FieldError msg={state?.fieldErrors?.type} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topic">Topic</Label>
              <Input id="topic" name="topic" defaultValue={session?.topic ?? ""} maxLength={200} placeholder="e.g. Nutrition on a budget" />
              <FieldError msg={state?.fieldErrors?.topic} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Title (optional)</Label>
              <Input id="title" name="title" defaultValue={session?.title ?? ""} maxLength={200} placeholder="Leave blank to use the topic" />
              <FieldError msg={state?.fieldErrors?.title} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="participantCount">Participants (number of residents)</Label>
              <Input id="participantCount" name="participantCount" type="number" min={0} max={10000} step={1} defaultValue={session?.participantCount ?? 0} required />
              <p className="text-xs text-muted-foreground">A count only. Never record names or details of residents.</p>
              <FieldError msg={state?.fieldErrors?.participantCount} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" defaultValue={session?.location ?? ""} maxLength={200} />
              <FieldError msg={state?.fieldErrors?.location} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={session?.notes ?? ""} rows={4} maxLength={5000} />
            <FieldError msg={state?.fieldErrors?.notes} />
          </div>

          {/* Materials: repeatable label + link rows. Inputs share a name so the server reads them with getAll(). */}
          <div className="space-y-2">
            <Label>Materials (slides, handouts, links)</Label>
            {materials.map((m, i) => (
              <div key={i} className="flex flex-col gap-2 sm:flex-row">
                <Input
                  name="material_label"
                  placeholder="Label"
                  value={m.label}
                  maxLength={120}
                  onChange={(e) => setMaterials((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  className="sm:w-1/3"
                />
                <Input
                  name="material_url"
                  placeholder="https://…"
                  type="url"
                  value={m.url}
                  maxLength={1000}
                  onChange={(e) => setMaterials((prev) => prev.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => setMaterials((prev) => prev.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setMaterials((prev) => [...prev, { label: "", url: "" }])}>
              Add material
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Volunteers involved</Label>
            {users.length === 0 ? <p className="text-sm text-muted-foreground">No active users yet.</p> : null}
            <div className="grid gap-1.5 sm:grid-cols-2 md:grid-cols-3">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="volunteerIds" value={u.id} defaultChecked={selected.has(u.id)} className="size-4 accent-primary" />
                  {u.firstName} {u.lastName}
                </label>
              ))}
            </div>
          </div>

          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <SubmitButton>{session ? "Save changes" : "Create session"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
