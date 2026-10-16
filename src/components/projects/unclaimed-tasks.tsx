import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { claimTask } from "@/lib/projects/actions";
import type { TaskRow } from "@/lib/projects/queries";
import { ActionButton } from "./action-button";
import { DueDate, PriorityBadge, ProjectDot } from "./bits";

/**
 * "Unclaimed tasks" section on /tasks. Every signed-in person sees it and can
 * claim a task with one click (the server action assigns it to them).
 */
export function UnclaimedTasks({ tasks }: { tasks: TaskRow[] }) {
  return (
    <Card id="unclaimed" size="sm">
      <CardHeader>
        <CardTitle>
          Unclaimed tasks
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">{tasks.length}</span>
        </CardTitle>
        <CardDescription>Nobody owns these yet. Claim one and it moves to your list.</CardDescription>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Everything has an owner right now. Check back later.</p>
        ) : (
          <ul className="divide-y">
            {tasks.map((t) => (
              <li key={t.id} className="flex flex-col gap-2 py-2.5 text-sm sm:flex-row sm:items-center sm:gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/tasks/${t.id}`} className="font-medium hover:underline">
                    {t.title}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {t.project ? (
                      <span className="inline-flex items-center gap-1">
                        <ProjectDot color={t.project.color} /> {t.project.title}
                      </span>
                    ) : null}
                    <span>
                      Due <DueDate task={t} />
                    </span>
                    <PriorityBadge priority={t.priority} />
                  </div>
                </div>
                <ActionButton action={claimTask.bind(null, t.id)} size="sm" className="shrink-0">
                  Claim
                </ActionButton>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
