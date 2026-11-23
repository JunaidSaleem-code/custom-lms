import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/features/admin/guard";
import { getPlan } from "@/features/admin/queries/catalogue";
import { PlanForm } from "@/features/admin/components/catalogue-forms";
import styles from "../../admin.module.css";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { db } = await requireAdmin();
  const data = await getPlan(db, id);
  return { title: data?.plan.name ?? "Plan" };
}

export default async function EditPlanPage({ params }: Props) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const data = await getPlan(db, id);
  if (!data) notFound();

  const { count } = await db
    .from("active_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", id);

  return (
    <>
      <p className={styles.gapSmall}>
        <Link href="/admin/plans" className="hint">
          ← All plans
        </Link>
      </p>
      <PageHeader
        eyebrow="Plan"
        title={data.plan.name}
        description={`${count ?? 0} active ${count === 1 ? "member" : "members"}. Changes to courses or communities apply to every member straight away.`}
      />
      <section className="card">
        <PlanForm
          plan={data.plan}
          courses={data.allCourses}
          communities={data.allCommunities.map((c) => ({ id: c.id, name: c.name }))}
          courseIds={data.courseIds}
          communityIds={data.communityIds}
        />
      </section>
    </>
  );
}
