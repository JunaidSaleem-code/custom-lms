import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/features/admin/guard";
import { listStudents } from "@/features/admin/queries/students";
import { listPlans } from "@/features/admin/queries/catalogue";
import { InviteStudentForm } from "@/features/admin/components/student-forms";
import { membershipBadge } from "@/features/admin/labels";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Students" };

type SearchParams = Promise<{ plan?: string; q?: string }>;

export default async function AdminStudentsPage({ searchParams }: { searchParams: SearchParams }) {
  const { db } = await requireAdmin();
  const { plan = "", q = "" } = await searchParams;

  const [plans, students] = await Promise.all([
    listPlans(db),
    listStudents(db, { planId: plan || undefined, query: q || undefined }),
  ]);

  const planOptions = plans.map((p) => ({ id: p.id, name: p.name, isActive: p.is_active }));
  const filtered = Boolean(plan || q);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Students"
        description="Everyone with a student account, their membership and when they were last active."
      />

      <section className={`card ${styles.panel} ${styles.gapBelow}`} aria-labelledby="invite-heading">
        <h2 id="invite-heading">Invite a student</h2>
        <p className="hint">
          Sends an invitation email. The student sets a password through the link. If you choose a plan, their access starts
          straight away.
        </p>
        <InviteStudentForm plans={planOptions} />
      </section>

      <form method="get" className={`${styles.toolbar} ${styles.section}`} role="search" aria-label="Find students">
        <div className="field">
          <label htmlFor="plan" className="label">
            Plan
          </label>
          <select id="plan" name="plan" className="input" defaultValue={plan}>
            <option value="">All students</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {!p.is_active ? " (inactive)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="q" className="label">
            Name or email
          </label>
          <input id="q" name="q" type="search" className="input" defaultValue={q} maxLength={100} />
        </div>
        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary">
            Filter
          </button>
          {filtered && (
            <Link href="/admin/students" className="btn btn-ghost">
              Clear
            </Link>
          )}
        </div>
      </form>

      <p className={`hint ${styles.gapSmall}`} aria-live="polite">
        {students.length} {students.length === 1 ? "student" : "students"}
        {filtered ? " match these filters" : ""}
      </p>

      {students.length === 0 ? (
        <EmptyState title={filtered ? "No students match" : "No students yet"}>
          <p>
            {filtered
              ? "Try a different plan or search term."
              : "Invite your first student above. They will appear here once they accept the invitation."}
          </p>
        </EmptyState>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>
              Students and their membership status
            </caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Membership</th>
                <th scope="col">Account</th>
                <th scope="col">Last active</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const badge = membershipBadge(s.membership);
                return (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/admin/students/${s.id}`}>{s.name || "No name yet"}</Link>
                    </td>
                    <td>{s.email}</td>
                    <td>
                      <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                    </td>
                    <td>
                      {s.invitedNotActivated ? (
                        <StatusBadge tone="warning">Invite not accepted</StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral">Active account</StatusBadge>
                      )}
                    </td>
                    <td>{s.lastActive ? <LocalTime iso={s.lastActive} /> : <span className="hint">Never</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// Per-user page: render on each request. Next.js instant navigation does not apply to personal data.
export const instant = false;
