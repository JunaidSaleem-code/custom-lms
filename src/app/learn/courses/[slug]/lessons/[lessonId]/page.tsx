import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/features/auth/session";
import { getLessonPage } from "@/features/courses/queries";
import { resolvePlayback } from "@/features/courses/playback";
import { LessonPlayer, type TimedQuestion } from "@/features/courses/components/lesson-player";
import { CourseOutline } from "@/features/courses/components/course-outline";
import { formatDuration } from "@/lib/format";
import { z } from "zod";
import styles from "./page.module.css";

type Props = { params: Promise<{ slug: string; lessonId: string }> };

const uuid = z.uuid();

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lessonId } = await params;
  if (!uuid.safeParse(lessonId).success) return { title: "Lesson" };
  const { supabase, user } = await requireUser();
  const page = await getLessonPage(supabase, lessonId, user.id);
  return { title: page?.lesson.title ?? "Lesson" };
}

export default async function LessonPage({ params }: Props) {
  const { slug, lessonId } = await params;

  // Reject malformed ids before they reach the database.
  if (!uuid.safeParse(lessonId).success) notFound();

  const { supabase, user } = await requireUser();
  const data = await getLessonPage(supabase, lessonId, user.id);
  if (!data) notFound();

  // The URL must match the lesson's course. Otherwise redirect to the canonical address.
  if (data.course.slug !== slug) redirect(`/learn/courses/${data.course.slug}/lessons/${lessonId}`);

  const playback = await resolvePlayback(data.lesson.stream_uid);
  const { lesson, questions, attempts } = data;

  const answered = Object.fromEntries(
    attempts.map((a) => [a.questionId, { isCorrect: a.isCorrect, pointsAwarded: a.pointsAwarded }]),
  );
  const timedQuestions: TimedQuestion[] = questions.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    points: q.points,
    explanation: q.explanation,
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
    showAtSeconds: q.showAtSeconds,
  }));

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <nav aria-label="Breadcrumb" className={styles.crumbs}>
          <Link href={`/learn/courses/${data.course.slug}`}>{data.course.title}</Link>
          <span aria-hidden="true">/</span>
          <span>{lesson.moduleTitle}</span>
        </nav>

        <header className={styles.header}>
          <p className="eyebrow">
            {lesson.moduleTitle} · {formatDuration(lesson.duration_seconds)}
          </p>
          <h1>{lesson.title}</h1>
          {lesson.description && <p>{lesson.description}</p>}
        </header>

        <LessonPlayer
          lessonId={lesson.id}
          playback={playback}
          durationSeconds={lesson.duration_seconds}
          initialPositionSeconds={lesson.progress?.furthestSeconds ?? 0}
          questions={timedQuestions}
          answered={answered}
        />

        {data.resources.length > 0 && (
          <section className={styles.resources} aria-labelledby="resources-heading">
            <h2 id="resources-heading">Materials</h2>
            <ul>
              {data.resources.map((r) => (
                <li key={r.id}>{r.title}</li>
              ))}
            </ul>
          </section>
        )}

        <nav className={styles.pager} aria-label="Lesson navigation">
          {data.previous ? (
            <Link href={`/learn/courses/${slug}/lessons/${data.previous.id}`} className="btn btn-ghost">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          {data.next ? (
            <Link href={`/learn/courses/${slug}/lessons/${data.next.id}`} className="btn btn-primary">
              Next lesson →
            </Link>
          ) : (
            <Link href={`/learn/courses/${slug}`} className="btn btn-ghost">
              Back to course
            </Link>
          )}
        </nav>
      </div>

      <aside className={styles.side} aria-label="Course outline">
        <h2 className={styles.sideTitle}>Course outline</h2>
        <CourseOutline courseSlug={slug} modules={data.outline} currentLessonId={lesson.id} />
      </aside>
    </div>
  );
}

// Per-user page: render on each request. Next.js instant navigation does not apply to personal data.
export const instant = false;
