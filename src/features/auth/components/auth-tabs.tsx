"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./auth-tabs.module.css";

type Props = { signupEnabled: boolean };

// Sign in / Create account switch shown at the top of the auth card. Hidden when sign-up is closed.
export function AuthTabs({ signupEnabled }: Props) {
  const pathname = usePathname();
  if (!signupEnabled) return null;

  const tabs = [
    { href: "/login", label: "Sign in" },
    { href: "/signup", label: "Create account" },
  ];

  return (
    <nav aria-label="Account" className={styles.tabs}>
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={styles.tab}
            aria-current={active ? "page" : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
