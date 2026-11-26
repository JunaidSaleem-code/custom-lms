import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/features/admin/guard";
import { getStudentDetail } from "@/features/admin/queries/students";
import { listPlans } from "@/features/admin/queries/catalogue";
import {
  ExtendEnrollmentForm,
  GrantPlanForm,
  RemoveStudentForm,
  ResetPasswordForm,
  RevokeEnrollmentForm,
} from "@/features/admin/components/student-forms";
import { enrollmentStatusBadge, eventLabel, percentOfLesson } from "@/features/admin/labels";
import { formatDuration, percent, plural } from "@/lib/format";
import styles from "../../admin.module.css";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { db } = await requireAdmin();
  const detail = await getStudentDetail(db, id);
  return { title: detail?.profile.full_name || detail?.email || "Student" };
}

export default async function AdminStudentPage({ params }: Props) {
  const { id } = await params;
  const { db, user } = await requireAdmin();
  const [detail, plans] = await Promise.all([getStudentDetail(db, id), listPlans(db)]);
  if (!detail) notFound();

  const { profile } = detail;
  const name = profile.full_name || detail.email || "Student";
  const isSelf = profile.id === user.id;
  const isAdmin = profile.role === "admin";
  const accuracy = detail.quiz.answered > 0 ? percent(detail.quiz.correct, detail.quiz.answered) : null;

  return (
    <>
      <p className={styles.gapSmall}>
        <Link href="/admin/students" className="hint">
          ← All students
        </Link>
      </p>
      <PageHeader eyebrow="Student" title={name} description={detail.email} />

      <section className={styles.stats} aria-label="Student summary">
        <div className={`card ${styles.stat}`}>
          <span className={styles.statLabel}>Last active</span>
          <span className={styles.statValueSmall}>
            {profile.last_active_at ? <LocalTime iso={profile.last_active_at} /> : "Never"}
          </span>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className={styles.statLabel}>Last sign-in</span>
          <span className={styles.statValueSmall}>
            {detail.lastSignIn ? <LocalTime iso={detail.lastSignIn} kind="date" /> : "Never"}
          </span>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className={styles.statLabel}>Points</span>
          <span className={styles.statValue}>{detail.points}</span>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className={styles.statLabel}>Quick-check accuracy</span>
          <span className={styles.statValue}>{accuracy === null ? "—" : `${accuracy}%`}</span>
          <span className="hint">
            {detail.quiz.answered === 0 ? "No answers yet" : `${detail.quiz.correct} of ${plural(detail.quiz.answered, "answer")} correct`}
          </span>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className={styles.statLabel}>Account</span>
          <span className={styles.statValueSmall}>
            {detail.confirmedAt ? "Password set" : detail.invitedAt ? "Invite not accepted" : "Created directly"}
          </span>
          <span className="hint">
            {detail.invitedAt ? <>Invited <LocalTime iso={detail.invitedAt} kind="date" /></> : "No invitation email on record"}
          </span>
        </div>
      </section>

      <div className={styles.columns}>
        <section className={`card ${styles.panel}`} aria-labelledby="memberships-heading">
          <div className={styles.panelHead}>
            <h2 id="memberships-heading">Memberships</h2>
          </div>
          {detail.enrollments.length === 0 ? (
            <p>No memberships yet. Add one below.</p>
          ) : (
            <ul className={styles.list}>
              {detail.enrollments.map((e) => {
                const badge = enrollmentStatusBadge(e.status);
                const planName = (e.plans as unknown as { name: string } | null)?.name ?? "Plan";
                const canEdit = e.status === "active" || e.status === "expired";
                return (
                  <li key={e.id} className={styles.item}>
                    <div className={styles.itemHead}>
                      <span className={styles.itemTitle}>{planName}</span>
                      <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                    </div>
                    <p className="hint">
                      Started <LocalTime iso={e.starts_at} kind="date" /> ·{" "}
                      {e.expires_at ? (
                        <>
                          ends <LocalTime iso={e.expires_at} kind="date" />
                        </>
                      ) : (
                        "no end date"
                      )}{" "}
                      · source: {e.source === "stripe" ? "website purchase" : "added by admin"}
                    </p>
                    {canEdit && (
                      <div className={styles.actions}>
                        <ExtendEnrollmentForm enrollmentId={e.id} userId={profile.id} />
                        <RevokeEnrollmentForm enrollmentId={e.id} userId={profile.id} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div className={styles.boxed}>
            <p className={styles.checkGroupTitle}>Add a membership</p>
            <GrantPlanForm userId={profile.id} plans={plans.map((p) => ({ id: p.id, name: p.name, isActive: p.is_active }))} />
          </div>
        </section>

        <section className={`card ${styles.panel}`} aria-labelledby="account-heading">
          <h2 id="account-heading">Account actions</h2>
          <div className={styles.stackTight}>
            <p className="hint">Sends an email with a one-time link. The student chooses a new password.</p>
            <ResetPasswordForm userId={profile.id} />
          </div>
          {!isSelf && !isAdmin && (
            <div className={styles.stackTight}>
              <p className="hint">Deleting removes the account, profile and all of its learning records. This cannot be undone.</p>
              <RemoveStudentForm userId={profile.id} />
            </div>
          )}
          {isAdmin && <p className="hint">This account is an admin. Remove admin access before removing the account.</p>}
          {isSelf && <p className="hint">This is your own account, so it can&apos;t be removed here.</p>}
        </section>
      </div>

      <section className={`card ${styles.panel} ${styles.gapAbove}`} aria-labelledby="progress-heading">
        <h2 id="progress-heading">Course and video progress</h2>
        <p className="hint">
          Where each student stopped, how much of each video they watched, and when each lesson was completed. Use this to check
          activity before answering coaching or refund questions.
        </p>
        {detail.progress.length === 0 ? (
          <EmptyState title="No video activity yet">
            <p>Progress appears here after the student opens a lesson and presses play.</p>
          </EmptyState>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className={styles.srOnly}>Lesson progress for this student</caption>
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Lesson</th>
                  <th scope="col">First opened</th>
                  <th scope="col">Stopped at</th>
                  <th scope="col">Furthest point</th>
                  <th scope="col">Time watched</th>
                  <th scope="col">Completed</th>
                  <th scope="col">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {detail.progress.map((p, i) => {
                  const lesson = p.lessons as unknown as {
                    title: string;
                    duration_seconds: number | null;
                    modules: { title: string; courses: { title: string } | null } | null;
                  } | null;
                  const furthest = percentOfLesson(Number(p.furthest_position_seconds), lesson?.duration_seconds);
                  return (
                    <tr key={i}>
                      <td>{lesson?.modules?.courses?.title ?? "—"}</td>
                      <td className={styles.wrapText}>
                        {lesson?.title ?? "—"}
                        <span className={styles.subline}>{lesson?.modules?.title ?? ""}</span>
                      </td>
                      <td>{p.first_interaction_at ? <LocalTime iso={p.first_interaction_at} /> : "—"}</td>
                      <td className={styles.num}>
                        {formatDuration(Number(p.last_position_seconds))}
                      </td>
                      <td>
                        <div className={styles.progressCell}>
                          <span className={styles.num}>{formatDuration(Number(p.furthest_position_seconds))}</span>
                          {furthest !== null && <ProgressBar value={furthest} label={`${furthest}% of the video reached`} />}
                        </div>
                      </td>
                      <td className={styles.num}>{formatDuration(Number(p.watched_seconds))}</td>
                      <td>
                        {p.completed_at ? (
                          <StatusBadge tone="success">
                            <LocalTime iso={p.completed_at} kind="date" />
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral">Not yet</StatusBadge>
                        )}
                      </td>
                      <td>{p.last_event_at ? <LocalTime iso={p.last_event_at} /> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className={`${styles.columns} ${styles.gapAbove}`}>
        <section className={`card ${styles.panel}`} aria-labelledby="events-heading">
          <h2 id="events-heading">Recent video events</h2>
          <p className="hint">The last 25 player events, newest first. Kept for dispute checks.</p>
          {detail.events.length === 0 ? (
            <p>No video events recorded.</p>
          ) : (
            <ul className={styles.list}>
              {detail.events.map((ev, i) => {
                const lesson = ev.lessons as unknown as { title: string } | null;
                return (
                  <li key={i} className={styles.itemHead}>
                    <span>
                      {eventLabel(ev.event_type)} · {lesson?.title ?? "Lesson"} at {formatDuration(Number(ev.position_seconds))}
                    </span>
                    <span className="hint">
                      <LocalTime iso={ev.occurred_at} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={`card ${styles.panel}`} aria-labelledby="certs-heading">
          <h2 id="certs-heading">Certificates</h2>
          {detail.certificates.length === 0 ? (
            <p>No certificates issued.</p>
          ) : (
            <ul className={styles.list}>
              {detail.certificates.map((c, i) => (
                <li key={i} className={styles.itemHead}>
                  <span>{(c.courses as unknown as { title: string } | null)?.title ?? "Course"}</span>
                  <span className="hint">
                    {c.certificate_number} · <LocalTime iso={c.issued_at} kind="date" />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

// Per-user page: render on each request. Next.js instant navigation does not apply to personal data.
export const instant = false;
