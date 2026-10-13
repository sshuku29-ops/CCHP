"use client";

// Collective progress charts for the admin dashboard (recharts).
// These show team-level numbers only — never per-person counts.

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TASK_STATUSES, TASK_STATUS_LABELS, type TaskStatus } from "@/lib/constants";

/** Same hues as <StatusBadge> so the chart and the tables read as one system. */
export const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  DONE: "#10b981",
  BLOCKED: "#ef4444",
};

export type TasksByProjectRow = { id: string; name: string; color: string | null } & Record<TaskStatus, number>;

const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 12 },
  cursor: { fill: "var(--muted)" },
};

/** Stacked horizontal bar per project: how many tasks sit in each status. */
export function TasksByProjectChart({ data }: { data: TasksByProjectRow[] }) {
  if (data.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">No active projects yet.</p>;
  const height = Math.max(160, data.length * 40 + 40);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 4 }} barSize={18}>
        <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tick={{ fontSize: 12, fill: "var(--foreground)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
        />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {TASK_STATUSES.map((s) => (
          <Bar key={s} dataKey={s} name={TASK_STATUS_LABELS[s]} stackId="tasks" fill={STATUS_COLORS[s]} radius={s === "BLOCKED" ? [0, 4, 4, 0] : 0} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Tasks completed per week for the last 8 weeks. */
export function CompletedPerWeekChart({ data }: { data: { week: string; completed: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="doneFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={STATUS_COLORS.DONE} stopOpacity={0.35} />
            <stop offset="100%" stopColor={STATUS_COLORS.DONE} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} cursor={{ stroke: "var(--border)" }} />
        <Area type="monotone" dataKey="completed" name="Completed" stroke={STATUS_COLORS.DONE} strokeWidth={2} fill="url(#doneFill)" dot={{ r: 3, fill: STATUS_COLORS.DONE, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
