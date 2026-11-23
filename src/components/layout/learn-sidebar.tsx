"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LEARN_NAV, type NavItem } from "@/config/navigation";
import styles from "./learn-sidebar.module.css";

function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type Props = {
  children?: React.ReactNode;
  items?: readonly NavItem[];
  brand?: string;
  brandHref?: string;
  label?: string;
};

// Shared sidebar for the student and admin areas. Pass `items` to reuse it for other sections.
export function LearnSidebar({
  children,
  items = LEARN_NAV,
  brand = "Sales Coaching",
  brandHref = "/learn",
  label = "Student navigation",
}: Props) {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <Link href={brandHref} className={styles.brand}>
        {brand}
      </Link>

      <nav aria-label={label} className={styles.nav}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={styles.link}
            aria-current={isActive(item, pathname) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children && <div className={styles.footer}>{children}</div>}
    </aside>
  );
}
