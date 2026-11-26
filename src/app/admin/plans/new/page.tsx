import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/features/admin/guard";
import { listCommunities } from "@/features/admin/queries/catalogue";
import { PlanForm } from "@/features/admin/components/catalogue-forms";
import styles from "../../admin.module.css";

export const metadata: Metadata = { title: "New plan" };

export default async function NewPlanPage() {
  const { db } = await requireAdmin();
  const [courses, communities] = await Promise.all([
    db.from("courses").select("id, title").order("sort_order"),
    listCommunities(db),
  ]);
  if (courses.error) throw new Error(courses.error.message);

  return (
    <>
      <p className={styles.gapSmall}>
        <Link href="/admin/plans" className="hint">
          ← All plans
        </Link>
      </p>
      <PageHeader eyebrow="Plans" title="New plan" description="Name the plan, set how long access lasts, then choose what it includes." />
      <section className="card">
        <PlanForm
          courses={courses.data ?? []}
          communities={communities.map((c) => ({ id: c.id, name: c.name }))}
          courseIds={[]}
          communityIds={[]}
        />
      </section>
    </>
  );
}

// Per-user page: render on each request. Next.js instant navigation does not apply to personal data.
export const instant = false;
