import Link from "next/link";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/constants";
import type { UserOption } from "@/lib/projects/queries";

export type TaskFilterValues = {
  status?: string;
  projectId?: string;
  assigneeId?: string;
  dueFrom?: string;
  dueTo?: string;
  needsOwner?: string;
  mine?: string;
  view?: string;
};

/**
 * Filter bar for /tasks. It is a plain GET form: submitting it just changes the
 * query string, and the server page re-queries. No client JS needed.
 */
export function TaskFilters({
  values,
  projects,
  users,
}: {
  values: TaskFilterValues;
  projects: { id: string; title: string }[];
  users: UserOption[];
}) {
  const hasFilter = Object.entries(values).some(([k, v]) => k !== "view" && v);
  return (
    <form method="get" action="/tasks" className="rounded-xl border bg-card p-3" data-allow-mobile>
      {values.view ? <input type="hidden" name="view" value={values.view} /> : null}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <NativeSelect name="status" defaultValue={values.status ?? ""} aria-label="Status">
          <option value="">Any status</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TASK_STATUS_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="projectId" defaultValue={values.projectId ?? ""} aria-label="Project">
          <option value="">Any project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="assigneeId" defaultValue={values.assigneeId ?? ""} aria-label="Assignee">
          <option value="">Any assignee</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </NativeSelect>
        <Input name="dueFrom" type="date" defaultValue={values.dueFrom ?? ""} aria-label="Due from" title="Due on or after" />
        <Input name="dueTo" type="date" defaultValue={values.dueTo ?? ""} aria-label="Due to" title="Due on or before" />
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="needsOwner" value="1" defaultChecked={values.needsOwner === "1"} className="size-4 accent-primary" />
            Needs owner
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="mine" value="1" defaultChecked={values.mine === "1"} className="size-4 accent-primary" />
            Mine
          </label>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button type="submit" size="sm" variant="secondary">
          Apply filters
        </Button>
        {hasFilter ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={values.view ? `/tasks?view=${values.view}` : "/tasks"}>Clear</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
