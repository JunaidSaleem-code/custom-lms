import styles from "./progress-bar.module.css";

type Props = {
  value: number; // 0..100
  label: string;
};

// Accessible progress bar: the label is announced, and the value is clamped to 0..100.
export function ProgressBar({ value, label }: Props) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className={styles.fill} style={{ width: `${pct}%` }} />
    </div>
  );
}
