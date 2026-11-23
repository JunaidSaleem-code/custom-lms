// Single source of truth for student navigation. Add a page here and it appears in the sidebar.
export type NavItem = {
  href: string;
  label: string;
  // Match the exact path only (used for the dashboard, so it isn't active on every page).
  exact?: boolean;
};

export const LEARN_NAV: readonly NavItem[] = [
  { href: "/learn", label: "Dashboard", exact: true },
  { href: "/learn/courses", label: "Courses" },
  { href: "/learn/progress", label: "Progress" },
  { href: "/learn/community", label: "Community" },
  { href: "/learn/messages", label: "Messages" },
  { href: "/learn/announcements", label: "Announcements" },
  { href: "/learn/calls", label: "Group calls" },
  { href: "/learn/certificates", label: "Certificates" },
  { href: "/learn/account", label: "Account" },
];
