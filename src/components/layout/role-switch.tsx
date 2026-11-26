import styles from "./role-switch.module.css";
import { switchRoleAction } from "@/features/admin/actions/role";

type Props = { current: "student" | "admin" };

// Toggle between the student dashboard and the admin dashboard.
// DEV ONLY for now: each click changes the account's role (see features/admin/actions/role.ts).
// Hidden in production, where admin is granted with scripts/set-admin.mjs.
export function RoleSwitch({ current }: Props) {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <nav aria-label="Dashboard view" className={styles.switch}>
      <form action={switchRoleAction}>
        <input type="hidden" name="role" value="student" />
        <button type="submit" className={styles.option} aria-current={current === "student" ? "page" : undefined}>
          Student
        </button>
      </form>
      <form action={switchRoleAction}>
        <input type="hidden" name="role" value="admin" />
        <button type="submit" className={styles.option} aria-current={current === "admin" ? "page" : undefined}>
          Admin
        </button>
      </form>
    </nav>
  );
}
