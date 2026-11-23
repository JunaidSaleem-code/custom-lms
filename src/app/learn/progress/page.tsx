import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireUser } from "@/features/auth/session";
import { getProgressReport } from "@/features/progress/queries";
import { formatDuration, percent, plural } from "@/lib/format";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage() {
  const { supabase } = await requireUser();
  const report = await getProgressReport(supabase);

  const accuracy =
    report.questionsAnswered > 0
      ? percent(report.questionsCorrect, report.questionsAnswered)
      : null;
  const hasActivity = report.lessons.length > 0 || report.questionsAnswered > 0;

  return (
    <>
      <PageHeader eyebrow="Progress" title="Your progress" description="How far you've got, and where you left off." />

      <section className={styles.stats} aria-label="Totals">
        <div className={`card ${styles.stat}`}>
          <span className={styles.label}>Total points</span>
          <span className={styles.value}>{report.totalPoints}</span>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className={styles.label}>Time watched</span>
          <span className={styles.value}>{formatDuration(report.totalWatchedSeconds)}</span>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className={styles.label}>Quick-check accuracy</span>
          <span className={styles.value}>{accuracy === null ? "—" : `${accuracy}%`}</span>
          <span className="hint">
            {report.questionsAnswered === 0
              ? "No quick checks answered yet"
              : `${report.questionsCorrect} of ${plural(report.questionsAnswered, "answer")} correct`}
          </span>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="courses-heading">
        <h2 id="courses-heading">Courses</h2>
        {report.courses.length === 0 ? (
          <EmptyState title="No courses yet">
            <p>Your course progress will show here once you have access to a course.</p>
          </EmptyState>
        ) : (
          <ul className={styles.courseList}>
            {report.courses.map((c) => {
              const pct = percent(c.completedLessons, c.totalLessons);
              return (
                <li key={c.id} className={`card ${styles.courseItem}`}>
                  <div className={styles.courseHead}>
                    <Link href={`/learn/courses/${c.slug}`} className={styles.courseTitle}>
                      {c.title}
                    </Link>
                    <span className="hint">{pct}%</span>
                  </div>
                  <ProgressBar value={pct} label={`${c.title} progress`} />
                  <span className="hint">
                    {c.completedLessons} of {plural(c.totalLessons, "lesson")} complete
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={styles.section} aria-labelledby="lessons-heading">
        <h2 id="lessons-heading">Lesson activity</h2>
        {!hasActivity ? (
          <EmptyState title="No activity yet">
            <p>Start a lesson and your watch progress, where you stopped and your quick-check results appear here.</p>
          </EmptyState>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Lesson</th>
                  <th scope="col">Stopped at</th>
                  <th scope="col">Watched</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {report.lessons.map((l) => (
                  <tr key={l.lessonId}>
                    <td>
                      <Link href={`/learn/courses/${l.courseSlug}/lessons/${l.lessonId}`} className={styles.lessonLink}>
                        {l.lessonTitle}
                      </Link>
                      <span className={styles.courseName}>{l.courseTitle}</span>
                    </td>
                    <td>
                      {formatDuration(l.furthestSeconds)}
                      {l.durationSeconds ? ` / ${formatDuration(l.durationSeconds)}` : ""}
                    </td>
                    <td>{formatDuration(l.watchedSeconds)}</td>
                    <td>
                      {l.completed ? <StatusBadge tone="success">Completed</StatusBadge> : <StatusBadge tone="brand">In progress</StatusBadge>}
                    </td>
                    <td>
                      <LocalTime iso={l.lastEventAt} kind="datetime" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="points-heading">
        <h2 id="points-heading">Recent points</h2>
        {report.recentPoints.length === 0 ? (
          <p className="hint">Points you earn from quick checks and activities will appear here.</p>
        ) : (
          <ul className={styles.points}>
            {report.recentPoints.map((p) => (
              <li key={p.id} className={styles.pointRow}>
                <span>+{p.points} · {labelFor(p.source_type)}</span>
                <span className="hint">
                  <LocalTime iso={p.created_at} kind="date" />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function labelFor(sourceType: string): string {
  const labels: Record<string, string> = {
    question: "Quick check",
    lesson: "Lesson completed",
    roleplay: "Roleplay session",
    challenge: "Challenge",
    manual: "Adjustment",
  };
  return labels[sourceType] ?? "Activity";
}
