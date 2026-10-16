"use client";

import { ActionForm } from "@/components/shared/action-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { NativeSelect } from "@/components/shared/native-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HOURS_TYPES, HOURS_TYPE_LABELS } from "@/lib/constants";
import { fmtDate, toDateInput } from "@/lib/dates";
import { logHours } from "@/lib/hours/actions";
import { Field } from "./field";

type SessionOption = { id: string; title: string | null; topic: string | null; date: Date; type: string };
type UserOption = { id: string; firstName: string; lastName: string };

/**
 * Log-hours form. Volunteers log for themselves. When `users` is given (admins),
 * a "Volunteer" select appears so leaders can log on someone's behalf.
 */
export function HoursLogForm({
  sessions,
  users,
  currentUserId,
}: {
  sessions: SessionOption[];
  users?: UserOption[];
  currentUserId: string;
}) {
  return (
    <ActionForm action={logHours} className="space-y-4" resetOnSuccess>
      {(state) => (
        <>
          {users ? (
            <Field id="hrs-user" label="Volunteer" error={state?.fieldErrors?.userId}>
              <NativeSelect id="hrs-user" name="userId" defaultValue={currentUserId}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                    {u.id === currentUserId ? " (me)" : ""}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="hrs-date" label="Date" error={state?.fieldErrors?.date}>
              <Input id="hrs-date" name="date" type="date" required defaultValue={toDateInput(new Date())} />
            </Field>
            <Field id="hrs-hours" label="Hours" help="Quarter-hour steps, e.g. 1.5" error={state?.fieldErrors?.hours}>
              <Input id="hrs-hours" name="hours" type="number" min={0.25} max={24} step={0.25} required placeholder="1.5" />
            </Field>
          </div>
          <Field id="hrs-type" label="Type" error={state?.fieldErrors?.type}>
            <NativeSelect id="hrs-type" name="type" defaultValue="PREP">
              {HOURS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {HOURS_TYPE_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="hrs-session" label="Session (optional)" help="Link these hours to a session from the last 90 days." error={state?.fieldErrors?.sessionRecordId}>
            <NativeSelect id="hrs-session" name="sessionRecordId" defaultValue="">
              <option value="">— none —</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {fmtDate(s.date)} · {s.title ?? s.topic ?? (s.type === "FORMAL" ? "Formal session" : "Informal session")}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="hrs-notes" label="Notes (optional)" error={state?.fieldErrors?.notes}>
            <Textarea id="hrs-notes" name="notes" rows={2} maxLength={1000} placeholder="What did you work on?" />
          </Field>
          <SubmitButton pendingText="Logging…">Log hours</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
