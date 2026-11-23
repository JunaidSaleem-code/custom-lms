import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LessonEngagement = { started: number; completed: number };

export type CourseEngagement = {
  perLesson: Map<string, LessonEngagement>;
  // Students with at least one lesson opened in this course.
  studentsStarted: number;
  // Students who completed every published lesson in this course.
  studentsCompleted: number;
};

// Course and lesson engagement for the course builder. A lesson is "started" when a student has any
// progress row for it, and "completed" when completed_at is set (the 90% rule lives in record_lesson_event).
export async function getCourseEngagement(
  db: SupabaseClient,
  lessons: readonly { id: string; status: string }[],
): Promise<CourseEngagement> {
  const perLesson = new Map<string, LessonEngagement>();
  const ids = lessons.map((l) => l.id);
  if (ids.length === 0) return { perLesson, studentsStarted: 0, studentsCompleted: 0 };

  const { data, error } = await db
    .from("lesson_progress")
    .select("lesson_id, user_id, completed_at")
    .in("lesson_id", ids);
  if (error) throw new Error(error.message);

  const published = new Set(lessons.filter((l) => l.status === "published").map((l) => l.id));
  const startedUsers = new Set<string>();
  const completedPerUser = new Map<string, number>();

  for (const row of data ?? []) {
    const current = perLesson.get(row.lesson_id) ?? { started: 0, completed: 0 };
    current.started += 1;
    if (row.completed_at) current.completed += 1;
    perLesson.set(row.lesson_id, current);

    startedUsers.add(row.user_id);
    if (row.completed_at && published.has(row.lesson_id)) {
      completedPerUser.set(row.user_id, (completedPerUser.get(row.user_id) ?? 0) + 1);
    }
  }

  const required = published.size;
  const studentsCompleted =
    required === 0 ? 0 : [...completedPerUser.values()].filter((n) => n >= required).length;

  return { perLesson, studentsStarted: startedUsers.size, studentsCompleted };
}
