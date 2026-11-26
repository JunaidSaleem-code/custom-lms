import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CourseSummary, LessonStatus, LessonSummary, ModuleOutline } from "./types";

type ProgressRow = {
  lesson_id: string;
  furthest_position_seconds: number | string;
  completed_at: string | null;
};

// Lists courses the student can access. RLS hides anything outside their plan.
export async function listCourses(supabase: SupabaseClient, userId: string): Promise<CourseSummary[]> {
  const [courses, progress] = await Promise.all([
    supabase
      .from("courses")
      .select("id, slug, title, description, sort_order")
      .order("sort_order")
      .order("title"),
    supabase.from("course_progress").select("course_id, total_lessons, completed_lessons").eq("user_id", userId),
  ]);
  if (courses.error) throw new Error(`Could not load courses: ${courses.error.message}`);
  if (progress.error) throw new Error(`Could not load progress: ${progress.error.message}`);

  // Postgres sums come back as strings, so convert them explicitly.
  const byCourse = new Map(
    (progress.data ?? []).map((p) => [
      p.course_id as string,
      { total: Number(p.total_lessons), completed: Number(p.completed_lessons) },
    ]),
  );

  return (courses.data ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    totalLessons: byCourse.get(c.id)?.total ?? 0,
    completedLessons: byCourse.get(c.id)?.completed ?? 0,
  }));
}

export async function getCourseBySlug(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from("courses")
    .select("id, slug, title, description")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Could not load course: ${error.message}`);
  return data;
}

export async function getCourseOutline(
  supabase: SupabaseClient,
  courseId: string,
  userId: string,
): Promise<ModuleOutline[]> {
  const [modules, progressRes] = await Promise.all([
    supabase
      .from("modules")
      .select(
        "id, title, description, sort_order, lessons(id, title, duration_seconds, sort_order, completion_threshold)",
      )
      .eq("course_id", courseId)
      .order("sort_order")
      .order("sort_order", { referencedTable: "lessons" }),
    supabase
      .from("lesson_progress")
      .select("lesson_id, furthest_position_seconds, completed_at")
      .eq("user_id", userId),
  ]);
  if (modules.error) throw new Error(`Could not load modules: ${modules.error.message}`);
  if (progressRes.error) throw new Error(`Could not load progress: ${progressRes.error.message}`);

  const progress = new Map<string, ProgressRow>(
    ((progressRes.data ?? []) as ProgressRow[]).map((p) => [p.lesson_id, p]),
  );

  return (modules.data ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    sort_order: m.sort_order,
    lessons: (m.lessons ?? []).map((l: LessonRow) => toLessonSummary(l, progress.get(l.id))),
  }));
}

type LessonRow = {
  id: string;
  title: string;
  duration_seconds: number | null;
  sort_order: number;
  completion_threshold: number;
};

export function toLessonSummary(l: LessonRow, p: ProgressRow | undefined): LessonSummary {
  const completed = Boolean(p?.completed_at);
  const furthest = Number(p?.furthest_position_seconds ?? 0);
  let status: LessonStatus = "not_started";
  if (completed) status = "completed";
  else if (furthest > 0) status = "in_progress";

  return {
    id: l.id,
    title: l.title,
    duration_seconds: l.duration_seconds,
    sort_order: l.sort_order,
    completion_threshold: l.completion_threshold,
    progress: p ? { furthestSeconds: furthest, completed } : null,
    status,
  };
}

// Everything the lesson page needs in one call. Returns null when the lesson is not visible to the student.
export async function getLessonPage(supabase: SupabaseClient, lessonId: string, userId: string) {
  const { data: lesson, error } = await supabase
    .from("lessons")
    .select(
      "id, title, description, stream_uid, duration_seconds, completion_threshold, modules(course_id)",
    )
    .eq("id", lessonId)
    .maybeSingle();
  if (error) throw new Error(`Could not load lesson: ${error.message}`);
  if (!lesson) return null;

  const courseId = (lesson.modules as unknown as { course_id: string } | null)?.course_id;
  if (!courseId) return null;

  const [course, outline, questions, resources] = await Promise.all([
    supabase.from("courses").select("id, slug, title").eq("id", courseId).maybeSingle(),
    getCourseOutline(supabase, courseId, userId),
    supabase
      .from("lesson_questions")
      .select(
        "id, question_text, show_at_seconds, points, explanation, sort_order, question_options(id, option_text, sort_order)",
      )
      .eq("lesson_id", lessonId)
      .order("show_at_seconds", { nullsFirst: false })
      .order("sort_order"),
    supabase
      .from("lesson_resources")
      .select("id, title, storage_path")
      .eq("lesson_id", lessonId)
      .order("sort_order"),
  ]);

  if (course.error || !course.data) return null;
  if (questions.error) throw new Error(`Could not load questions: ${questions.error.message}`);
  if (resources.error) throw new Error(`Could not load resources: ${resources.error.message}`);

  // Only this lesson's answers, so the query stays small as the student's history grows.
  const questionIds = (questions.data ?? []).map((q) => q.id);
  const attempts = questionIds.length
    ? await supabase
        .from("question_attempts")
        .select("question_id, selected_option_id, is_correct, points_awarded")
        .eq("user_id", userId)
        .in("question_id", questionIds)
    : { data: [], error: null };
  if (attempts.error) throw new Error(`Could not load answers: ${attempts.error.message}`);

  const flat = outline.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title })));
  const index = flat.findIndex((l) => l.id === lessonId);
  const current = flat[index];
  const progressRow = current?.progress ?? null;

  return {
    course: course.data,
    lesson: {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      stream_uid: lesson.stream_uid,
      duration_seconds: lesson.duration_seconds,
      completion_threshold: lesson.completion_threshold,
      moduleTitle: current?.moduleTitle ?? "",
      progress: progressRow,
    },
    outline,
    previous: index > 0 ? flat[index - 1] : null,
    next: index >= 0 && index < flat.length - 1 ? flat[index + 1] : null,
    questions: (questions.data ?? []).map((q) => ({
      id: q.id,
      questionText: q.question_text,
      showAtSeconds: q.show_at_seconds === null ? null : Number(q.show_at_seconds),
      points: q.points,
      explanation: q.explanation,
      options: (q.question_options ?? [])
        .slice()
        .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
        .map((o: { id: string; option_text: string }) => ({ id: o.id, text: o.option_text })),
    })),
    attempts: (attempts.data ?? []).map((a) => ({
      questionId: a.question_id as string,
      selectedOptionId: a.selected_option_id as string | null,
      isCorrect: a.is_correct as boolean,
      pointsAwarded: a.points_awarded as number,
    })),
    resources: resources.data ?? [],
  };
}

export type LessonPageData = NonNullable<Awaited<ReturnType<typeof getLessonPage>>>;
