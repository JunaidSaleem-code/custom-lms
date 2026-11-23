import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listCourses } from "@/features/courses/queries";
import type { CourseSummary } from "@/features/courses/types";
import { listRecentAndUpcomingCalls } from "@/features/calls/queries";
import { listAnnouncements, type Announcement } from "@/features/announcements/queries";
import { callWindow, type CallRow } from "@/features/calls/status";

export type ContinueLesson = {
  lessonId: string;
  lessonTitle: string;
  courseSlug: string;
  courseTitle: string;
  furthestSeconds: number;
  durationSeconds: number | null;
};

export type DashboardData = {
  courses: CourseSummary[];
  courseCount: number;
  inProgressCount: number;
  completedLessons: number;
  totalLessons: number;
  points: number;
  continueLesson: ContinueLesson | null;
  nextCall: CallRow | null;
  latestAnnouncements: Announcement[];
};

export async function getDashboardData(supabase: SupabaseClient, now = new Date()): Promise<DashboardData> {
  const [courses, points, calls, announcements, resume] = await Promise.all([
    listCourses(supabase),
    supabase.from("user_points").select("total_points").maybeSingle(),
    listRecentAndUpcomingCalls(supabase, now),
    listAnnouncements(supabase, 3),
    getResumeLesson(supabase),
  ]);

  if (points.error) throw new Error(`Could not load points: ${points.error.message}`);

  // Next call = the first one that hasn't ended yet.
  const nextCall = calls.find((c) => callWindow(c, now).state !== "ended") ?? null;

  return {
    courses,
    courseCount: courses.length,
    inProgressCount: courses.filter((c) => c.completedLessons > 0 && c.completedLessons < c.totalLessons).length,
    completedLessons: courses.reduce((n, c) => n + c.completedLessons, 0),
    totalLessons: courses.reduce((n, c) => n + c.totalLessons, 0),
    points: Number(points.data?.total_points ?? 0),
    continueLesson: resume,
    nextCall,
    latestAnnouncements: announcements,
  };
}

// The most recently touched lesson that isn't finished yet.
async function getResumeLesson(supabase: SupabaseClient): Promise<ContinueLesson | null> {
  const { data, error } = await supabase
    .from("lesson_progress")
    .select(
      "furthest_position_seconds, lessons(id, title, duration_seconds, modules(courses(slug, title)))",
    )
    .is("completed_at", null)
    .order("last_event_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not load recent lesson: ${error.message}`);

  // Embedded rows are null when RLS hides them (for example, a course that has since been removed from the plan).
  type Row = {
    furthest_position_seconds: number | string;
    lessons: {
      id: string;
      title: string;
      duration_seconds: number | null;
      modules: { courses: { slug: string; title: string } | null } | null;
    } | null;
  };
  const row = data as unknown as Row | null;
  const lesson = row?.lessons;
  const course = lesson?.modules?.courses;
  if (!row || !lesson || !course) return null;

  return {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    courseSlug: course.slug,
    courseTitle: course.title,
    furthestSeconds: Number(row.furthest_position_seconds),
    durationSeconds: lesson.duration_seconds,
  };
}
