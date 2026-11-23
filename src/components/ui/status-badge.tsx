import type { ReactNode } from "react";
import styles from "./status-badge.module.css";

type Tone = "neutral" | "brand" | "success" | "warning";

export function StatusBadge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
