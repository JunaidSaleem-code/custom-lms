import type { ReactNode } from "react";
import styles from "./empty-state.module.css";

type Props = {
  title: string;
  children?: ReactNode;
};

// Used whenever a list or section has no data yet. Always explains what happens next.
export function EmptyState({ title, children }: Props) {
  return (
    <div className={`card ${styles.wrap}`}>
      <h2>{title}</h2>
      {children && <div className={styles.body}>{children}</div>}
    </div>
  );
}
