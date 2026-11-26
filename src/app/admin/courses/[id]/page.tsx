import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";

import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/features/admin/guard";
import { getCourseTree } from "@/features/admin/queries/catalogue";
import { getCourseEngagement } from "@/features/admin/queries/engagement";
import {
  CourseForm,
  LessonForm,
  ModuleForm,
  QuestionForm,
} from "@/features/admin/components/catalogue-forms";
import { statusBadge } from "@/features/admin/labels";
import { formatDuration, percent, plural } from "@/lib/format";
import styles from "../../admin.module.css";

type Props = { params: Promise<{ id: string }> };

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  stream_uid: string | null;
  duration_seconds: number | null;
  completion_threshold: number;
  status: "draft" | "published";
  sort_order: number;
  lesson_questions: {
    id: string;
    question_text: string;
    show_at_seconds: number | null;
    points: number;
    is_approved: boolean;
    question_options: { id: string; is_correct: boolean }[];
  }[];
};

type CourseModule = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  sort_order: number;
  lessons: Lesson[];
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { db } = await requireAdmin();
  const course = await getCourseTree(db, id);
  return { title: course?.title ?? "Course" };
}

export default async function CourseBuilderPage({ params }: Props) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const course = await getCourseTree(db, id);
  if (!course) notFound();

  const modules = course.modules as unknown as CourseModule[];
  const allLessons = modules.flatMap((m) => m.lessons);
  const engagement = await getCourseEngagement(db, allLessons);
  const lessonCount = allLessons.length;
  const badge = statusBadge(course.status);

  return (
    <>
      <p className={styles.gapSmall}>
        <Link href="/admin/courses" className="hint">
          ← All courses
        </Link>
      </p>
      <PageHeader eyebrow="Course builder" title={course.title} description={course.description ?? "No description yet."} />

      <section className={styles.stats} aria-label="Course engagement">
        <div className={`card ${styles.stat}`}>
          <span className={styles.statLabel}>Visibility</span>
          <span className={styles.statValueSmall}>
            <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
          </span>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className={styles.statLabel}>Structure</span>
          <span className={styles.statValueSmall}>
            {plural(modules.length, "module")}, {plural(lessonCount, "lesson")}
          </span>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className={styles.statLabel}>Students who started</span>
          <span className={styles.statValue}>{engagement.studentsStarted}</span>
        </div>
        <div className={`card ${styles.stat}`}>
          <span className={styles.statLabel}>Students who completed</span>
          <span className={styles.statValue}>{engagement.studentsCompleted}</span>
          <span className="hint">Every published lesson finished</span>
        </div>
      </section>

      <div className={styles.columns}>
        <section className={`card ${styles.panel}`} aria-labelledby="details-heading">
          <h2 id="details-heading">Course details</h2>
          <CourseForm
            course={{
              id: course.id,
              title: course.title,
              slug: course.slug,
              description: course.description,
              status: course.status,
              sort_order: course.sort_order,
            }}
          />
        </section>

        <section className={`card ${styles.panel}`} aria-labelledby="add-module-heading">
          <h2 id="add-module-heading">Add a module</h2>
          <p className="hint">Modules group related lessons, for example &ldquo;Week 1: Discovery calls&rdquo;.</p>
          <ModuleForm courseId={course.id} />
        </section>
      </div>

      <section className={`${styles.section} ${styles.gapAbove}`} aria-labelledby="modules-heading">
        <h2 id="modules-heading">Modules and lessons</h2>

        {modules.length === 0 ? (
          <EmptyState title="No modules yet">
            <p>Add a module above, then add lessons to it.</p>
          </EmptyState>
        ) : (
          modules.map((mod) => {
            const moduleBadge = statusBadge(mod.status);
            return (
              <article key={mod.id} className={`card ${styles.panel}`} aria-labelledby={`module-${mod.id}`}>
                <div className={styles.itemHead}>
                  <div>
                    <h3 id={`module-${mod.id}`}>{mod.title}</h3>
                    <p className="hint">{plural(mod.lessons.length, "lesson")}</p>
                  </div>
                  <StatusBadge tone={moduleBadge.tone}>{moduleBadge.label}</StatusBadge>
                </div>

                <details className={styles.details}>
                  <summary className={styles.summary}>Module settings</summary>
                  <div className={styles.detailsBody}>
                    <ModuleForm courseId={course.id} module={mod} />
                  </div>
                </details>

                {mod.lessons.length > 0 && (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <caption className={styles.srOnly}>Lessons in {mod.title}</caption>
                      <thead>
                        <tr>
                          <th scope="col">Lesson</th>
                          <th scope="col">Video</th>
                          <th scope="col">Length</th>
                          <th scope="col">Completed at</th>
                          <th scope="col">Started</th>
                          <th scope="col">Completed</th>
                          <th scope="col">Quick checks</th>
                          <th scope="col">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mod.lessons.map((lesson) => {
                          const stats = engagement.perLesson.get(lesson.id) ?? { started: 0, completed: 0 };
                          const badgeLesson = statusBadge(lesson.status);
                          return (
                            <tr key={lesson.id}>
                              <td className={styles.wrapText}>{lesson.title}</td>
                              <td>
                                {lesson.stream_uid ? (
                                  <StatusBadge tone="brand">Attached</StatusBadge>
                                ) : (
                                  <StatusBadge tone="warning">No video</StatusBadge>
                                )}
                              </td>
                              <td className={styles.num}>{lesson.duration_seconds ? formatDuration(lesson.duration_seconds) : "—"}</td>
                              <td className={styles.num}>{Math.round(lesson.completion_threshold * 100)}%</td>
                              <td className={styles.num}>{stats.started}</td>
                              <td className={styles.num}>
                                {stats.completed} <span className="hint">({percent(stats.completed, stats.started)}%)</span>
                              </td>
                              <td className={styles.num}>{lesson.lesson_questions.length}</td>
                              <td>
                                <StatusBadge tone={badgeLesson.tone}>{badgeLesson.label}</StatusBadge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {mod.lessons.map((lesson) => (
                  <details key={lesson.id} className={styles.details}>
                    <summary className={styles.summary}>
                      <span>
                        Edit lesson: {lesson.title}
                      </span>
                    </summary>
                    <div className={styles.detailsBody}>
                      <LessonForm
                        courseId={course.id}
                        moduleId={mod.id}
                        lesson={{
                          id: lesson.id,
                          title: lesson.title,
                          description: lesson.description,
                          stream_uid: lesson.stream_uid,
                          duration_seconds: lesson.duration_seconds,
                          completion_threshold: lesson.completion_threshold,
                          status: lesson.status,
                          sort_order: lesson.sort_order,
                        }}
                      />

                      <div className={styles.stackTight}>
                        <h4>Quick checks in this lesson</h4>
                        {lesson.lesson_questions.length === 0 ? (
                          <p className="hint">None yet. Add one below. It pauses the video at the time you set.</p>
                        ) : (
                          <ul className={styles.list}>
                            {[...lesson.lesson_questions]
                              .sort((a, b) => Number(a.show_at_seconds ?? 0) - Number(b.show_at_seconds ?? 0))
                              .map((q) => (
                                <li key={q.id} className={styles.itemHead}>
                                  <span>{q.question_text}</span>
                                  <span className="hint">
                                    {q.show_at_seconds !== null ? `at ${formatDuration(q.show_at_seconds)}` : "no time set"} ·{" "}
                                    {plural(q.points, "point")} · {q.question_options.length} options
                                  </span>
                                </li>
                              ))}
                          </ul>
                        )}
                        <details className={styles.details}>
                          <summary className={styles.summary}>Add a quick check</summary>
                          <div className={styles.detailsBody}>
                            <QuestionForm courseId={course.id} lessonId={lesson.id} />
                          </div>
                        </details>
                      </div>
                    </div>
                  </details>
                ))}

                <details className={styles.details}>
                  <summary className={styles.summary}>Add a lesson to {mod.title}</summary>
                  <div className={styles.detailsBody}>
                    <LessonForm courseId={course.id} moduleId={mod.id} />
                  </div>
                </details>
              </article>
            );
          })
        )}
      </section>

      <p className={`hint ${styles.gapAbove}`}>
        Hard deletes are not offered: removing a lesson would also remove student progress that refund checks rely on. Set a lesson
        or module to Draft to hide it from students.
      </p>
    </>
  );
}

// Per-user page: render on each request. Next.js instant navigation does not apply to personal data.
export const instant = false;
