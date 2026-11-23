import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <p className="eyebrow">Sales Coaching Portal</p>
        <h1 className={styles.title}>Practise the conversations that close deals.</h1>
        <p className={styles.lead}>
          Courses, coaching and live roleplay practice in one place.
        </p>
        <div className={styles.actions}>
          <Link href="/learn" className="btn btn-primary">
            Open dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
