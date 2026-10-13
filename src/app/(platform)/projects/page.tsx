import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { requireModule } from "@/lib/auth/guards";
import { listProjects } from "@/lib/projects/queries";
import { PROJECT_STATUSES } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { isTaskOverdue } from "@/lib/projects/progress";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProgressBar, ProjectDot } from "@/components/projects/bits";
import { cn } from "@/lib/utils";

export const metadata = { title: "Projects" };

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Active", ON_HOLD: "On hold", COMPLETED: "Completed", ARCHIVED: "Archived" };

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  await requireModule("projects");
  const sp = await searchParams;
  const raw = typeof sp.status === "string" ? sp.status : "";
  // ?status=ACTIVE etc. filters to one status; ?status=all shows everything;
  // no filter defaults to "open" (active + on hold) so archived work does not clutter the list.
  const status = (PROJECT_STATUSES as readonly string[]).includes(raw) ? raw : undefined;
  const projects = await listProjects(status ? { status } : {});
  const shown = status || raw === "all" ? projects : projects.filter((p) => p.status === "ACTIVE" || p.status === "ON_HOLD");

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Each project serves a goal and is made of tasks. Progress = tasks done / total."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href="/api/export/projects">
                <Download /> Export CSV
              </a>
            </Button>
            <Button asChild size="sm">
              <Link href="/projects/new">
                <Plus /> New project
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap gap-1.5">
        <FilterLink href="/projects" active={!raw}>
          Open
        </FilterLink>
        {PROJECT_STATUSES.map((s) => (
          <FilterLink key={s} href={`/projects?status=${s}`} active={raw === s}>
            {STATUS_LABELS[s]}
          </FilterLink>
        ))}
        <FilterLink href="/projects?status=all" active={raw === "all"}>
          All
        </FilterLink>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title="No projects here"
          description="Create a project and attach it to a goal so its tasks count toward the goal's progress."
          action={
            <Button asChild size="sm">
              <Link href="/projects/new">New project</Link>
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Project</TableHead>
                <TableHead className="w-52">Progress</TableHead>
                <TableHead className="hidden md:table-cell">Owner</TableHead>
                <TableHead className="hidden lg:table-cell">Goal</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((p) => {
                const overdue = isTaskOverdue({ dueDate: p.dueDate, status: p.status === "COMPLETED" ? "DONE" : "TODO" });
                return (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-[20rem] whitespace-normal font-medium">
                      <Link href={`/projects/${p.id}`} className="inline-flex items-center gap-2 hover:underline">
                        <ProjectDot color={p.color} /> {p.title}
                      </Link>
                      {p.goal ? <span className="mt-0.5 block text-xs text-muted-foreground lg:hidden">{p.goal.title}</span> : null}
                    </TableCell>
                    <TableCell>
                      <ProgressBar progress={p.progress} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {p.owner ? `${p.owner.firstName} ${p.owner.lastName}` : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="hidden max-w-[16rem] truncate lg:table-cell">
                      {p.goal ? (
                        <Link href={`/goals/${p.goal.id}`} className="hover:underline">
                          {p.goal.title}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className={cn(overdue && "font-medium text-red-600 dark:text-red-400")}>{fmtDate(p.dueDate)}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} label={STATUS_LABELS[p.status]} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn("rounded-full border px-3 py-1 text-sm transition-colors", active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
    >
      {children}
    </Link>
  );
}
