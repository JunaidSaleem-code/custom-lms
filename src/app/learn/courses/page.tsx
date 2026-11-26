import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/features/auth/session";
import { listCourses } from "@/features/courses/queries";
import { CourseCard } from "@/features/courses/components/course-card";
import { getMembershipState } from "@/features/membership/queries";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage() {
  const { supabase, user } = await requireUser();
  const [courses, membership] = await Promise.all([
    listCourses(supabase, user.id),
    getMembershipState(supabase),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Courses"
        title="Your courses"
        description="Courses included in your membership plan."
      />

      {/* Placeholder (docs/PLACEHOLDERS.md #19): AI voice roleplay is not built yet. */}
      <section className="card" aria-labelledby="roleplay-heading" style={{ marginBottom: 16 }}>
        <h2 id="roleplay-heading">Roleplay practice</h2>
        <p className="hint">AI voice roleplay is coming soon.</p>
        <button type="button" className="btn btn-ghost" disabled title="Roleplay is coming soon">
          Start a roleplay (coming soon)
        </button>
      </section>

      {courses.length === 0 ? (
        <EmptyState title="No courses available yet">
          {membership.kind === "none" || membership.kind === "ended" || membership.kind === "expired" ? (
            <p>Your courses appear here once your membership is active.</p>
          ) : (
            <p>Courses for your plan are being prepared. Check back soon.</p>
          )}
        </EmptyState>
      ) : (
        <div className={styles.grid}>
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </>
  );
}
