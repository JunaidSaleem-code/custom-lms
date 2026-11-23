import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/features/auth/session";
import { getOwnProfile } from "@/features/account/queries";
import { SignOutForm } from "@/features/auth/components/sign-out-form";
import { LearnSidebar } from "@/components/layout/learn-sidebar";
import { RoleSwitch } from "@/components/layout/role-switch";
import styles from "./layout.module.css";

export default async function LearnLayout({ children }: { children: ReactNode }) {
  const { supabase, user } = await requireUser();
  const profile = await getOwnProfile(supabase, user.id);

  // A login without a profile row means the signup trigger failed. Don't show a broken dashboard.
  if (!profile) redirect("/auth/error?reason=no-profile");

  const displayName = profile.full_name ?? user.email ?? "Member";

  return (
    <div className={styles.shell}>
      <LearnSidebar>
        <div className={styles.account}>
          {/* Shown to everyone for now. /admin still checks the admin role, so non-admins are sent back here. */}
          <RoleSwitch current="student" />
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

// Personal, per-request content: render on the server for each visit (not part of the static shell).
export const instant = false;
