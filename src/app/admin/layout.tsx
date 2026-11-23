import type { ReactNode } from "react";
import { requireAdmin } from "@/features/admin/guard";
import { SignOutForm } from "@/features/auth/components/sign-out-form";
import { LearnSidebar } from "@/components/layout/learn-sidebar";
import { RoleSwitch } from "@/components/layout/role-switch";
import { ADMIN_NAV } from "@/config/admin-navigation";
import styles from "./admin.module.css";

// Every page under /admin goes through requireAdmin. Non-admins are redirected to the student dashboard.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireAdmin();
  const displayName = profile.full_name ?? "Admin";

  return (
    <div className={styles.shell}>
      <LearnSidebar items={ADMIN_NAV} brand="Admin" brandHref="/admin" label="Admin navigation">
        <div className={styles.account}>
          <RoleSwitch current="admin" />
          <span className={styles.name}>{displayName}</span>
          <SignOutForm />
        </div>
      </LearnSidebar>
      <main className={styles.main} id="main">
        {children}
      </main>
    </div>
  );
}

// Admin pages show live, per-user data. Never prerender them.
export const instant = false;
