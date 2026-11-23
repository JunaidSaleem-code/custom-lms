import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/features/admin/guard";
import { listCoursesAdmin } from "@/features/admin/queries/catalogue";
import { CourseForm } from "@/features/admin/components/catalogue-forms";
import { plural } from "@/lib/format";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Courses" };

export default async function AdminCoursesPage() {
  const { db } = await requireAdmin();
  const courses = await listCoursesAdmin(db);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Courses"
        description="Build courses from modules and video lessons. Draft courses stay hidden until you publish them."
      />

      <section className={`card ${styles.panel} ${styles.gapBelow}`} aria-labelledby="new-course-heading">
        <h2 id="new-course-heading">New course</h2>
        <CourseForm />
      </section>

      {courses.length === 0 ? (
        <EmptyState title="No courses yet">
          <p>Create a course above, then add its modules and lessons in the course builder.</p>
        </EmptyState>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Courses</caption>
            <thead>
              <tr>
                <th scope="col">Course</th>
                <th scope="col">Visibility</th>
                <th scope="col">Modules</th>
                <th scope="col">Lessons</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/courses/${c.id}`}>{c.title}</Link>
                  </td>
                  <td>
                    {c.status === "published" ? (
                      <StatusBadge tone="success">Published</StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">Draft</StatusBadge>
                    )}
                  </td>
                  <td className={styles.num}>{plural(c.moduleCount, "module")}</td>
                  <td className={styles.num}>{plural(c.lessonCount, "lesson")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
