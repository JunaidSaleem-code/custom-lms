import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function listPlans(db: SupabaseClient) {
  const { data, error } = await db
    .from("plans")
    .select("id, slug, name, description, access_duration_days, stripe_price_id, is_active")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPlan(db: SupabaseClient, id: string) {
  const [plan, courses, communities, allCourses, allCommunities] = await Promise.all([
    db.from("plans").select("id, slug, name, description, access_duration_days, stripe_price_id, is_active").eq("id", id).maybeSingle(),
    db.from("plan_courses").select("course_id").eq("plan_id", id),
    db.from("community_plans").select("community_id").eq("plan_id", id),
    db.from("courses").select("id, title").order("sort_order"),
    db.from("communities").select("id, name").order("name"),
  ]);
  for (const r of [plan, courses, communities, allCourses, allCommunities]) {
    if (r.error) throw new Error(r.error.message);
  }
  if (!plan.data) return null;
  return {
    plan: plan.data,
    courseIds: (courses.data ?? []).map((c) => c.course_id as string),
    communityIds: (communities.data ?? []).map((c) => c.community_id as string),
    allCourses: allCourses.data ?? [],
    allCommunities: allCommunities.data ?? [],
  };
}

export async function listCoursesAdmin(db: SupabaseClient) {
  const { data, error } = await db
    .from("courses")
    .select("id, slug, title, status, sort_order, modules(id, lessons(id))")
    .order("sort_order")
    .order("title");
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => {
    const modules = (c.modules ?? []) as { lessons: { id: string }[] }[];
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      status: c.status,
      sort_order: c.sort_order,
      moduleCount: modules.length,
      lessonCount: modules.reduce((n, m) => n + (m.lessons?.length ?? 0), 0),
    };
  });
}

// Full course tree for editing, including draft items and quiz answers (admins only).
export async function getCourseTree(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from("courses")
    .select(
      "id, slug, title, description, status, sort_order, modules(id, title, description, status, sort_order, lessons(id, title, description, stream_uid, duration_seconds, completion_threshold, status, sort_order, lesson_questions(id, question_text, show_at_seconds, points, explanation, is_approved, question_options(id, option_text, is_correct, sort_order))))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const modules = ((data.modules ?? []) as Array<Record<string, unknown>>)
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
    .map((m) => ({
      ...m,
      lessons: ((m.lessons ?? []) as Array<Record<string, unknown>>).sort(
        (a, b) => Number(a.sort_order) - Number(b.sort_order),
      ),
    }));
  return { ...data, modules };
}

export async function listCommunities(db: SupabaseClient) {
  const { data, error } = await db
    .from("communities")
    .select("id, slug, name, description, is_active, community_plans(plan_id)")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    ...c,
    planCount: ((c.community_plans ?? []) as unknown[]).length,
  }));
}
