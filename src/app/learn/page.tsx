import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireUser } from "@/features/auth/session";
import { getOwnProfile } from "@/features/account/queries";
import { getMembershipState } from "@/features/membership/queries";
import { MembershipBanner } from "@/features/membership/components/membership-banner";
import { getDashboardData } from "@/features/dashboard/queries";
import { callWindow } from "@/features/calls/status";
import { formatDuration, percent, plural } from "@/lib/format";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const [profile, membership, data] = await Promise.all([
    getOwnProfile(supabase, user.id),
    getMembershipState(supabase),
    getDashboardData(supabase, user.id),
  ]);

  const firstName = profile?.full_name?.split(" ")[0];
  const resume = data.continueLesson;
  const resumePct = resume?.durationSeconds ? percent(resume.furthestSeconds, resume.durationSeconds) : 0;
  const call = data.nextCall;
  const callState = call ? callWindow(call) : null;

  return (
    <div className={styles.page}>
      <header className={styles.greeting}>
        <h1>{firstName ? `Welcome back, ${firstName}.` : "Welcome back."}</h1>
        <p className={styles.summary}>
          {data.totalLessons > 0
            ? `${data.completedLessons} of ${plural(data.totalLessons, "lesson")} complete, ${plural(data.points, "point")} earned, ${data.inProgressCount} ${data.inProgressCount === 1 ? "course" : "courses"} in progress.`
            : "Your courses and progress will appear here."}
        </p>
      </header>

      <MembershipBanner state={membership} />

      <div className={styles.columns}>
        <div className={styles.main}>
          <section className={styles.resume} aria-labelledby="resume-heading">
            <h2 id="resume-heading" className={styles.sectionLabel}>
              Continue learning
            </h2>
            {resume ? (
              <>
                <p className={styles.resumeTitle}>{resume.lessonTitle}</p>
                <p className={styles.resumeMeta}>
                  {resume.courseTitle}. Stopped at {formatDuration(resume.furthestSeconds)}
                  {resume.durationSeconds ? ` of ${formatDuration(resume.durationSeconds)}` : ""}.
                </p>
                {resume.durationSeconds ? (
                  <div className={styles.resumeBar}>
                    <ProgressBar value={resumePct} label={`${resume.lessonTitle} progress`} />
                  </div>
                ) : null}
                <Link
                  href={`/learn/courses/${resume.courseSlug}/lessons/${resume.lessonId}`}
                  className="btn btn-primary"
                >
                  Resume lesson
                </Link>
              </>
            ) : (
              <EmptyState title="Nothing in progress yet">
                <p>
                  <Link href="/learn/courses" className={styles.textLink}>
                    Browse your courses
                  </Link>{" "}
                  to start your first lesson.
                </p>
              </EmptyState>
            )}
          </section>

          <section className={styles.courses} aria-labelledby="courses-heading">
            <div className={styles.rowHead}>
              <h2 id="courses-heading" className={styles.sectionLabel}>
                Your courses
              </h2>
              {data.courses.length > 0 && (
                <Link href="/learn/courses" className={styles.textLink}>
                  All courses
                </Link>
              )}
            </div>
            {data.courses.length === 0 ? (
              <p className="hint">No courses on your plan yet.</p>
            ) : (
              <ul className={styles.courseList}>
                {data.courses.map((c) => {
                  const pct = percent(c.completedLessons, c.totalLessons);
                  return (
                    <li key={c.id}>
                      <Link href={`/learn/courses/${c.slug}`} className={styles.courseRow}>
                        <span className={styles.courseTitle}>{c.title}</span>
                        <span className={styles.courseMeta}>
                          {c.totalLessons === 0
                            ? "Lessons coming soon"
                            : `${c.completedLessons} of ${c.totalLessons} lessons`}
                        </span>
                        <span className={styles.courseBar}>
                          <ProgressBar value={pct} label={`${c.title} progress`} />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className={styles.aside} aria-label="Coming up">
          <section className={styles.block} aria-labelledby="call-heading">
            <h2 id="call-heading" className={styles.sectionLabel}>
              Next group call
            </h2>
            {call && callState ? (
              <>
                <p className={styles.callTitle}>{call.title}</p>
                <p className={styles.callMeta}>
                  {callState.state === "live" ? "Live now" : <LocalTime iso={call.starts_at} kind="datetime" />}
                  {" · "}
                  {call.duration_minutes} min
                </p>
                {callState.joinable && call.join_url ? (
                  <a href={call.join_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                    Join call
                  </a>
                ) : (
                  <p className="hint">
                    {call.join_url ? "The join link opens 15 minutes before the start." : "The join link will be shared before the call."}
                  </p>
                )}
              </>
            ) : (
              <p className="hint">Nothing scheduled. Check back later.</p>
            )}
          </section>

          <section className={styles.block} aria-labelledby="announcements-heading">
            <div className={styles.rowHead}>
              <h2 id="announcements-heading" className={styles.sectionLabel}>
                Announcements
              </h2>
              <Link href="/learn/announcements" className={styles.textLink}>
                See all
              </Link>
            </div>
            {data.latestAnnouncements.length === 0 ? (
              <p className="hint">No announcements yet.</p>
            ) : (
              <ul className={styles.news}>
                {data.latestAnnouncements.map((a) => (
                  <li key={a.id} className={styles.newsItem}>
                    <span className={styles.newsTitle}>{a.title}</span>
                    <span className={styles.newsDate}>
                      <LocalTime iso={a.published_at} kind="date" />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Placeholder (docs/PLACEHOLDERS.md #4 and #20): leaderboard waits on the points rules. */}
          <section className={styles.block} aria-labelledby="leaderboard-heading">
            <h2 id="leaderboard-heading" className={styles.sectionLabel}>
              Leaderboard
            </h2>
            <p className="hint">Leaderboard coming soon.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
