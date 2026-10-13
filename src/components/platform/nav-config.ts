import type { ModuleKey } from "@/lib/constants";

export type NavItem = {
  href: string;
  label: string;
  icon: string; // lucide icon name, resolved in sidebar
  /** Module required (admins). Omit = visible to every signed-in user. */
  module?: ModuleKey;
  /** Only for these roles. */
  roles?: string[];
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/calendar", label: "Calendar", icon: "CalendarDays" },
      { href: "/notifications", label: "Notifications", icon: "Bell" },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/goals", label: "Goals", icon: "Target", module: "projects" },
      { href: "/projects", label: "Projects", icon: "FolderKanban", module: "projects" },
      { href: "/tasks", label: "Tasks", icon: "ListChecks" },
      { href: "/waiting-on", label: "Waiting on", icon: "Hourglass", module: "projects" },
      { href: "/feedback", label: "Feedback & ideas", icon: "MessageSquare" },
      { href: "/notes", label: "Meeting notes", icon: "NotebookPen", module: "projects" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/recruitment", label: "Recruitment", icon: "UserPlus", module: "recruitment" },
      { href: "/volunteers", label: "Volunteers", icon: "Users", module: "volunteers" },
      { href: "/courses", label: "Training", icon: "GraduationCap" },
      { href: "/library", label: "Library", icon: "Library" },
      { href: "/hours", label: "Hours", icon: "Clock" },
      { href: "/certificates", label: "Certificates", icon: "Award", module: "volunteers" },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/sessions", label: "Sessions", icon: "BookOpen", module: "records" },
      { href: "/sessions/roster", label: "Session roster", icon: "UsersRound", module: "records" },
      { href: "/reports-admin", label: "Annual reports", icon: "FileText", module: "reports" },
      { href: "/site-content", label: "Public site", icon: "Globe", module: "site" },
      { href: "/handoff", label: "Handoff docs", icon: "ArrowRightLeft", module: "handoff" },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/settings/users", label: "Users & roles", icon: "ShieldCheck", roles: ["MAIN_ADMIN"] },
      { href: "/settings", label: "Settings", icon: "Settings", roles: ["MAIN_ADMIN"] },
    ],
  },
];
