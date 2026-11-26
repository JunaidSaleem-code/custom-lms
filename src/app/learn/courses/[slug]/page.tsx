import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireUser } from "@/features/auth/session";
import { getCourseBySlug, getCourseOutline } from "@/features/courses/queries";
import { CourseOutline } from "@/features/courses/components/course-outline";
import { percent } from "@/lib/format";
import styles from "./page.module.css";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { supabase } = await requireUser();
  const course = await getCourseBySlug(supabase, slug);
  return { title: course?.title ?? "Course" };
}

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const { supabase, user } = await requireUser();

  // Hidden by RLS when the course isn't in the student's plan, so this returns nothing.
  const course = await getCourseBySlug(supabase, slug);
  if (!course) notFound();

  const modules = await getCourseOutline(supabase, course.id, user.id);
  const lessons = modules.flatMap((m) => m.lessons);
  const completed = lessons.filter((l) => l.status === "completed").length;

  return (
    <>
      <PageHeader eyebrow="Course" title={course.title} description={course.description ?? undefined} />

      <section className={styles.summary} aria-label="Course progress">
        <ProgressBar value={percent(completed, lessons.length)} label="Course progress" />
        <p className="hint">
          {completed} of {lessons.length} lessons complete
        </p>
      </section>

      <CourseOutline courseSlug={course.slug} modules={modules} />
    </>
  );
}

// Per-user page: render on each request. Next.js instant navigation does not apply to personal data.
export const instant = false;
