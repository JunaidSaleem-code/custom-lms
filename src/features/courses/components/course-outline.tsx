import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDuration } from "@/lib/format";
import type { LessonStatus, ModuleOutline } from "../types";
import styles from "./course-outline.module.css";

const STATUS_LABEL: Record<LessonStatus, { label: string; tone: "neutral" | "brand" | "success" }> = {
  not_started: { label: "Not started", tone: "neutral" },
  in_progress: { label: "In progress", tone: "brand" },
  completed: { label: "Completed", tone: "success" },
};

type Props = {
  courseSlug: string;
  modules: ModuleOutline[];
  currentLessonId?: string;
};

// Module and lesson list used on the course page and in the lesson sidebar.
export function CourseOutline({ courseSlug, modules, currentLessonId }: Props) {
  if (modules.length === 0) {
    return <p className="hint">Lessons for this course will appear here once they are published.</p>;
  }

  return (
    <ol className={styles.modules} aria-label="Course outline">
      {modules.map((m, mi) => (
        <li key={m.id} className={styles.module}>
          <h3 className={styles.moduleTitle}>
            <span className={styles.moduleIndex}>Module {mi + 1}</span>
            {m.title}
          </h3>
          {m.description && <p className={styles.moduleDescription}>{m.description}</p>}

          <ol className={styles.lessons}>
            {m.lessons.map((l) => {
              const status = STATUS_LABEL[l.status];
              const current = l.id === currentLessonId;
              return (
                <li key={l.id}>
                  <Link
                    href={`/learn/courses/${courseSlug}/lessons/${l.id}`}
                    className={styles.lesson}
                    aria-current={current ? "step" : undefined}
                  >
                    <span className={styles.lessonTitle}>{l.title}</span>
                    <span className={styles.meta}>
                      <span>{formatDuration(l.duration_seconds)}</span>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </li>
      ))}
    </ol>
  );
}
