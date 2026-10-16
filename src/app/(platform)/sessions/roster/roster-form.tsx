"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect } from "@/components/shared/native-select";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { saveSessionRoster } from "@/lib/roster/actions";
import { SESSION_ROLES, SESSION_ROLE_LABELS, type AssignableUser } from "@/lib/roster/roles";

/**
 * "Assign" form for one session: tick people, pick each person's role, save.
 * Shows each person's number of sessions this term so load can be spread evenly.
 */
export function RosterForm({
  sessionId,
  users,
  assigned,
}: {
  sessionId: string;
  users: AssignableUser[];
  /** userId -> role for people already on this session */
  assigned: Record<string, string>;
}) {
  const [q, setQ] = useState("");
  const [checked, setChecked] = useState<Set<string>>(() => new Set(Object.keys(assigned)));
  const needle = q.trim().toLowerCase();
  const visible = needle ? users.filter((u) => `${u.firstName} ${u.lastName}`.toLowerCase().includes(needle)) : users;

  function toggle(id: string, on: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <ActionForm action={saveSessionRoster.bind(null, sessionId)} className="space-y-2">
      {(state) => (
        <>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a name…" aria-label="Find a name" className="h-8" />
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
            {visible.length === 0 ? <p className="p-1 text-xs text-muted-foreground">No one matches.</p> : null}
            {visible.map((u) => {
              const on = checked.has(u.id);
              return (
                <div key={u.id} className="flex items-center gap-2 text-sm">
                  <label className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      name="userIds"
                      value={u.id}
                      checked={on}
                      onChange={(e) => toggle(u.id, e.target.checked)}
                      className="size-4 shrink-0 rounded border-input accent-primary"
                    />
                    <span className="truncate">
                      {u.firstName} {u.lastName}
                    </span>
                    {u.role !== "VOLUNTEER" ? <span className="shrink-0 text-xs text-muted-foreground">leader</span> : null}
                    <span className="shrink-0 text-xs text-muted-foreground" title="Sessions this term">
                      {u.assignmentsThisTerm}×
                    </span>
                  </label>
                  {on ? (
                    <NativeSelect name={`role_${u.id}`} defaultValue={assigned[u.id] ?? "presenter"} aria-label={`Role for ${u.firstName}`} className="h-7 w-28 shrink-0 text-xs">
                      {SESSION_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {SESSION_ROLE_LABELS[r]}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : null}
                </div>
              );
            })}
            {/* People hidden by the search box stay selected: keep their inputs in the form. */}
            {users
              .filter((u) => checked.has(u.id) && !visible.includes(u))
              .map((u) => (
                <span key={u.id} hidden>
                  <input type="hidden" name="userIds" value={u.id} />
                  <input type="hidden" name={`role_${u.id}`} value={assigned[u.id] ?? "presenter"} />
                </span>
              ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {checked.size} selected · the number after each name is their sessions this term
            </span>
            <SubmitButton size="sm">Save roster</SubmitButton>
          </div>
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        </>
      )}
    </ActionForm>
  );
}
