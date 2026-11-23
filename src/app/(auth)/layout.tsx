import type { ReactNode } from "react";
import { AuthTabs } from "@/features/auth/components/auth-tabs";
import { isSignupEnabled } from "@/features/auth/config";
import styles from "./auth.module.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brandRow}>
          <p className={styles.brand}>Sales Coaching</p>
        </div>
        <AuthTabs signupEnabled={isSignupEnabled()} />
        {children}
      </div>
    </main>
  );
}

// Reads the sign-up setting per request, so changes in .env.local take effect after a restart.
export const instant = false;
