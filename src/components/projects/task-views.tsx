import type { TaskRow } from "@/lib/projects/queries";
import { TaskTable } from "./task-table";
import { TaskBoard } from "./task-board";
import { TaskTimeline } from "./task-timeline";
import type { TaskView } from "./view-tabs";

/** Renders the chosen view (list / board / timeline) for a set of tasks. */
export function TaskViews({ view, tasks, showProject = true }: { view: TaskView; tasks: TaskRow[]; showProject?: boolean }) {
  if (view === "board") return <TaskBoard tasks={tasks} showProject={showProject} />;
  if (view === "timeline") return <TaskTimeline tasks={tasks} showProject={showProject} />;
  return <TaskTable tasks={tasks} showProject={showProject} />;
}
