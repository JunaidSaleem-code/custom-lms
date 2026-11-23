import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireAdmin } from "@/features/admin/guard";
import { getOverview } from "@/features/admin/queries/overview";
import { percent } from "@/lib/format";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverviewPage() {
  const { db } = await requireAdmin();
  const o = await getOverview(db);

  const maxWeekday = Math.max(1, ...o.weekdays.map((d) => d.count));
  const invited = o.funnel.invited;

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Overview"
        description="How students, memberships and lessons are doing. Figures update on each page load."
      />

      <section className={styles.stats} aria-label="Key figures">
        <div className={`card ${styles.stat}`}>
          <span className={styles.statLabel}>Students</span>
          <span className={styles.statValue}>{o.totalStudents}</span>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className={styles.statLabel}>Active memberships</span>
          <span className={styles.statValue}>{o.activeMemberships}</span>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className={styles.statLabel}>Retention (7 days)</span>
          <span className={styles.statValue}>{o.retention7d}%</span>
          <span className="hint">Students active in the last week</span>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className={styles.statLabel}>Churn (30 days)</span>
          <span className={styles.statValue}>{o.churn30d}%</span>
          <span className="hint">Memberships ended or refunded in the last month</span>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className={styles.statLabel}>Lesson completion</span>
          <span className={styles.statValue}>{o.completion}%</span>
          <span className="hint">Completed lessons out of all lessons, per student</span>
        </div>
      </section>

      <div className={styles.columns}>
        <section className={`card ${styles.panel}`} aria-labelledby="funnel-heading">
          <h2 id="funnel-heading">Enrollment funnel</h2>
          <div className={styles.funnel}>
            <FunnelRow label="Invited" count={o.funnel.invited} base={invited} />
            <FunnelRow label="Registered (set a password)" count={o.funnel.registered} base={invited} />
            <FunnelRow label="Enrolled (active membership)" count={o.funnel.enrolled} base={invited} />
          </div>
          <p className="hint">Bars show each stage as a share of invited students.</p>
        </section>

        <section className={`card ${styles.panel}`} aria-labelledby="weekday-heading">
          <h2 id="weekday-heading">Activity by weekday</h2>
          <p className="hint">Lesson events in the last 90 days, by day of the week (UTC).</p>
          <div className={styles.bars} role="img" aria-label="Lesson events by weekday">
            {o.weekdays.map((d) => (
              <div key={d.label} className={styles.barCol}>
                <span className={styles.barValue}>{d.count}</span>
                <div
                  className={styles.barFill}
                  style={{ height: `${Math.max(2, Math.round((d.count / maxWeekday) * 100))}%` }}
                />
                <span className={styles.barLabel}>{d.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={`card ${styles.panel} ${styles.gapAbove}`} aria-labelledby="recent-heading">
        <h2 id="recent-heading">Last active students</h2>
        {o.lastActiveSorted.length === 0 ? (
          <EmptyState title="No activity yet">
            <p>Students appear here once they have signed in and used the portal.</p>
          </EmptyState>
        ) : (
          <ul className={styles.list}>
            {o.lastActiveSorted.map((s) => (
              <li key={s.id} className={styles.itemHead}>
                <Link href={`/admin/students/${s.id}`} className={styles.itemTitle}>
                  {s.full_name || "No name yet"}
                </Link>
                <span className="hint">
                  Last active <LocalTime iso={s.last_active_at!} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="hint">
        Churn and retention are estimates from enrollment dates and last-active times.
      </p>
    </>
  );
}

function FunnelRow({ label, count, base }: { label: string; count: number; base: number }) {
  const pct = percent(count, base);
  return (
    <div className={styles.funnelRow}>
      <div className={styles.funnelHead}>
        <span>{label}</span>
        <span className={styles.num}>{count}</span>
      </div>
      <ProgressBar value={pct} label={`${label}: ${count}`} />
    </div>
  );
}
