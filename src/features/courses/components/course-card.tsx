import Link from "next/link";
import { ProgressBar } from "@/components/ui/progress-bar";
import { percent, plural } from "@/lib/format";
import type { CourseSummary } from "../types";
import styles from "./course-card.module.css";

export function CourseCard({ course }: { course: CourseSummary }) {
  const pct = percent(course.completedLessons, course.totalLessons);
  const hasLessons = course.totalLessons > 0;

  return (
    <Link href={`/learn/courses/${course.slug}`} className={`card ${styles.card}`}>
      <h2 className={styles.title}>{course.title}</h2>
      {course.description && <p className={styles.description}>{course.description}</p>}
      <div className={styles.footer}>
        {hasLessons ? (
          <>
            <ProgressBar value={pct} label={`${course.title} progress`} />
            <span className={styles.meta}>
              {course.completedLessons} of {plural(course.totalLessons, "lesson")} complete
            </span>
          </>
        ) : (
          <span className={styles.meta}>Lessons coming soon</span>
        )}
      </div>
    </Link>
  );
}
