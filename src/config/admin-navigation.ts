import type { NavItem } from "./navigation";

// Admin sidebar. Add a page here and it appears in the admin area.
export const ADMIN_NAV: readonly NavItem[] = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/communities", label: "Communities" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/calls", label: "Group calls" },
  { href: "/admin/messages", label: "Messages" },
];
