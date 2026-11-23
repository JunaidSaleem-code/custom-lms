import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/features/admin/guard";
import { listPlans } from "@/features/admin/queries/catalogue";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Plans" };

export default async function AdminPlansPage() {
  const { db } = await requireAdmin();
  const [plans, enrollments] = await Promise.all([
    listPlans(db),
    db.from("active_enrollments").select("plan_id"),
  ]);
  if (enrollments.error) throw new Error(enrollments.error.message);

  const memberCount = new Map<string, number>();
  for (const row of enrollments.data ?? []) {
    memberCount.set(row.plan_id, (memberCount.get(row.plan_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Plans"
        description="The membership plans students buy or are granted. Each plan sets its courses, its communities and how long access lasts."
        actions={
          <Link href="/admin/plans/new" className="btn btn-primary">
            New plan
          </Link>
        }
      />

      {plans.length === 0 ? (
        <EmptyState title="No plans yet">
          <p>Create the first plan, for example Basic Course, then choose which courses and communities it includes.</p>
        </EmptyState>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Membership plans</caption>
            <thead>
              <tr>
                <th scope="col">Plan</th>
                <th scope="col">Access lasts</th>
                <th scope="col">Active members</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/plans/${p.id}`}>{p.name}</Link>
                  </td>
                  <td>{p.access_duration_days ? `${p.access_duration_days} days` : "No expiry"}</td>
                  <td className={styles.num}>{memberCount.get(p.id) ?? 0}</td>
                  <td>
                    {p.is_active ? <StatusBadge tone="success">Active</StatusBadge> : <StatusBadge tone="neutral">Inactive</StatusBadge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
