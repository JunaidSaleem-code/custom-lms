import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listCourses } from "@/features/courses/queries";
import type { CourseSummary } from "@/features/courses/types";

export type LessonActivity = {
  lessonId: string;
  lessonTitle: string;
  courseTitle: string;
  courseSlug: string;
  furthestSeconds: number;
  watchedSeconds: number;
  durationSeconds: number | null;
  completed: boolean;
  lastEventAt: string;
};

export type PointEntry = {
  id: string;
  points: number;
  source_type: string;
  created_at: string;
};

export type ProgressReport = {
  courses: CourseSummary[];
  lessons: LessonActivity[];
  totalWatchedSeconds: number;
  questionsAnswered: number;
  questionsCorrect: number;
  totalPoints: number;
  recentPoints: PointEntry[];
};

// Everything on the progress page. RLS limits each query to the student's own rows.
export async function getProgressReport(supabase: SupabaseClient): Promise<ProgressReport> {
  const [courses, lessonRows, attempts, points, recent] = await Promise.all([
    listCourses(supabase),
    supabase
      .from("lesson_progress")
      .select(
        "furthest_position_seconds, watched_seconds, completed_at, last_event_at, lessons(id, title, duration_seconds, modules(courses(slug, title)))",
      )
      .order("last_event_at", { ascending: false }),
    supabase.from("question_attempts").select("is_correct"),
    supabase.from("user_points").select("total_points").maybeSingle(),
    supabase
      .from("points_ledger")
      .select("id, points, source_type, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (lessonRows.error) throw new Error(`Could not load lesson progress: ${lessonRows.error.message}`);
  if (attempts.error) throw new Error(`Could not load quiz results: ${attempts.error.message}`);
  if (points.error) throw new Error(`Could not load points: ${points.error.message}`);
  if (recent.error) throw new Error(`Could not load point history: ${recent.error.message}`);

  type Row = {
    furthest_position_seconds: number | string;
    watched_seconds: number | string;
    completed_at: string | null;
    last_event_at: string;
    lessons: {
      id: string;
      title: string;
      duration_seconds: number | null;
      modules: { courses: { slug: string; title: string } | null } | null;
    } | null;
  };

  const lessons: LessonActivity[] = ((lessonRows.data ?? []) as unknown as Row[])
    .filter((r) => r.lessons?.modules?.courses)
    .map((r) => ({
      lessonId: r.lessons!.id,
      lessonTitle: r.lessons!.title,
      courseTitle: r.lessons!.modules!.courses!.title,
      courseSlug: r.lessons!.modules!.courses!.slug,
      furthestSeconds: Number(r.furthest_position_seconds),
      watchedSeconds: Number(r.watched_seconds),
      durationSeconds: r.lessons!.duration_seconds,
      completed: Boolean(r.completed_at),
      lastEventAt: r.last_event_at,
    }));

  const attemptRows = attempts.data ?? [];

  return {
    courses,
    lessons,
    totalWatchedSeconds: lessons.reduce((n, l) => n + l.watchedSeconds, 0),
    questionsAnswered: attemptRows.length,
    questionsCorrect: attemptRows.filter((a) => a.is_correct).length,
    totalPoints: Number(points.data?.total_points ?? 0),
    recentPoints: (recent.data ?? []) as PointEntry[],
  };
}
