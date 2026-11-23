import Link from "next/link";
import styles from "./role-switch.module.css";

type Props = { current: "student" | "admin" };

// Toggle between the student dashboard and the admin dashboard. Only render it for admins.
// It is a plain pair of links, so it works without JavaScript and each side keeps its own URL.
// When roles are added, the decision of who sees it stays in hasAdminAccess (features/admin/access.ts).
export function RoleSwitch({ current }: Props) {
  return (
    <nav aria-label="Dashboard view" className={styles.switch}>
      <Link
        href="/learn"
        className={styles.option}
        aria-current={current === "student" ? "page" : undefined}
      >
        Student
      </Link>
      <Link
        href="/admin"
        className={styles.option}
        aria-current={current === "admin" ? "page" : undefined}
      >
        Admin
      </Link>
    </nav>
  );
}
