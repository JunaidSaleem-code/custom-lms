"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireAdmin } from "../guard";
import { parseAccessDays, parseSeconds, parseSortOrder, parseThresholdPercent, slugify } from "../input";
import type { FormState } from "@/lib/form-state";

// Hard deletes are deliberately not offered for courses, modules or lessons: deleting them would
// remove student progress that the refund and performance checks rely on. Use "draft" to hide content.

const uuid = z.uuid({ error: "Invalid id." });
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const streamUidPattern = /^[a-zA-Z0-9]{1,64}$/;

function slugFrom(raw: FormDataEntryValue | null, fallbackText: string): string {
  const typed = String(raw ?? "").trim();
  return typed === "" ? slugify(fallbackText) : slugify(typed);
}

// Next position at the end of a list, so new items don't collide with existing sort orders.
async function nextSortOrder(db: SupabaseClient, table: string, scope?: { column: string; value: string }): Promise<number> {
  let query = db.from(table).select("sort_order").order("sort_order", { ascending: false }).limit(1);
  if (scope) query = query.eq(scope.column, scope.value);
  const { data } = await query;
  const top = data?.[0]?.sort_order;
  return typeof top === "number" ? top + 1 : 0;
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === "23505";
}

// ---------------------------------------------------------------- plans

export async function savePlanAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await requireAdmin();

  const days = parseAccessDays(String(formData.get("accessDays") ?? ""));
  if (!days.ok) return { error: days.error };

  const parsed = z
    .object({
      planId: z.union([z.literal(""), uuid]),
      name: z.string().trim().min(2, "Enter a plan name.").max(80),
      description: z.string().trim().max(1000).optional(),
      stripePriceId: z.string().trim().max(100).optional(),
      courseIds: z.array(uuid),
      communityIds: z.array(uuid),
    })
    .safeParse({
      planId: formData.get("planId") ?? "",
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      stripePriceId: formData.get("stripePriceId") ?? "",
      courseIds: formData.getAll("courseIds"),
      communityIds: formData.getAll("communityIds"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the plan details." };

  const slug = slugFrom(formData.get("slug"), parsed.data.name);
  if (!slugPattern.test(slug)) return { error: "The URL name can only use lowercase letters, numbers and dashes." };

  const row = {
    slug,
    name: parsed.data.name,
    description: parsed.data.description || null,
    access_duration_days: days.value,
    stripe_price_id: parsed.data.stripePriceId || null,
    is_active: formData.get("isActive") === "on",
    updated_at: new Date().toISOString(),
  };

  let planId = parsed.data.planId;
  if (planId) {
    const { error } = await db.from("plans").update(row).eq("id", planId);
    if (error) {
      if (isUniqueViolation(error)) return { error: "Another plan already uses that URL name or Stripe price." };
      return { error: "The plan could not be saved. Try again." };
    }
  } else {
    const { data, error } = await db.from("plans").insert(row).select("id").single();
    if (error || !data) {
      if (error && isUniqueViolation(error)) return { error: "Another plan already uses that URL name or Stripe price." };
      return { error: "The plan could not be created. Try again." };
    }
    planId = data.id;
  }

  // Replace the links in one go. Changing them changes every member's access at once, by design.
  const [courses, communities] = await Promise.all([
    db.from("plan_courses").delete().eq("plan_id", planId),
    db.from("community_plans").delete().eq("plan_id", planId),
  ]);
  if (courses.error || communities.error) return { error: "The plan was saved, but its courses or communities could not be updated." };

  if (parsed.data.courseIds.length > 0) {
    const { error } = await db
      .from("plan_courses")
      .insert(parsed.data.courseIds.map((course_id) => ({ plan_id: planId, course_id })));
    if (error) return { error: "The plan was saved, but its courses could not be updated." };
  }
  if (parsed.data.communityIds.length > 0) {
    const { error } = await db
      .from("community_plans")
      .insert(parsed.data.communityIds.map((community_id) => ({ plan_id: planId, community_id })));
    if (error) return { error: "The plan was saved, but its communities could not be updated." };
  }

  revalidatePath("/admin/plans");
  revalidatePath(`/admin/plans/${planId}`);
  if (!parsed.data.planId) redirect(`/admin/plans/${planId}`);
  return { success: "Plan saved." };
}

// ---------------------------------------------------------------- courses

export async function saveCourseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await requireAdmin();
  const parsed = z
    .object({
      courseId: z.union([z.literal(""), uuid]),
      title: z.string().trim().min(2, "Enter a course title.").max(120),
      description: z.string().trim().max(2000).optional(),
      status: z.enum(["draft", "published"], { error: "Choose draft or published." }),
    })
    .safeParse({
      courseId: formData.get("courseId") ?? "",
      title: formData.get("title"),
      description: formData.get("description") ?? "",
      status: formData.get("status"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the course details." };

  const slug = slugFrom(formData.get("slug"), parsed.data.title);
  if (!slugPattern.test(slug)) return { error: "The URL name can only use lowercase letters, numbers and dashes." };
  const sortOrder = parseSortOrder(String(formData.get("sortOrder") ?? ""), 0);

  const row = {
    slug,
    title: parsed.data.title,
    description: parsed.data.description || null,
    status: parsed.data.status,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.courseId) {
    const { error } = await db.from("courses").update(row).eq("id", parsed.data.courseId);
    if (error) return { error: isUniqueViolation(error) ? "Another course uses that URL name." : "The course could not be saved." };
    revalidatePath("/admin/courses");
    revalidatePath(`/admin/courses/${parsed.data.courseId}`);
    return { success: "Course saved." };
  }

  const finalSort = String(formData.get("sortOrder") ?? "").trim() === "" ? await nextSortOrder(db, "courses") : sortOrder;
  const { data, error } = await db.from("courses").insert({ ...row, sort_order: finalSort }).select("id").single();
  if (error || !data) return { error: isUniqueViolation(error ?? {}) ? "Another course uses that URL name." : "The course could not be created." };
  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${data.id}`);
}

// ---------------------------------------------------------------- modules

export async function saveModuleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await requireAdmin();
  const parsed = z
    .object({
      courseId: uuid,
      moduleId: z.union([z.literal(""), uuid]),
      title: z.string().trim().min(2, "Enter a module title.").max(120),
      description: z.string().trim().max(2000).optional(),
      status: z.enum(["draft", "published"], { error: "Choose draft or published." }),
    })
    .safeParse({
      courseId: formData.get("courseId"),
      moduleId: formData.get("moduleId") ?? "",
      title: formData.get("title"),
      description: formData.get("description") ?? "",
      status: formData.get("status"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the module details." };

  const sortRaw = String(formData.get("sortOrder") ?? "");
  const row = {
    title: parsed.data.title,
    description: parsed.data.description || null,
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.moduleId) {
    const { error } = await db
      .from("modules")
      .update({ ...row, sort_order: parseSortOrder(sortRaw, 0) })
      .eq("id", parsed.data.moduleId)
      .eq("course_id", parsed.data.courseId);
    if (error) return { error: "The module could not be saved." };
  } else {
    const sort = sortRaw.trim() === "" ? await nextSortOrder(db, "modules", { column: "course_id", value: parsed.data.courseId }) : parseSortOrder(sortRaw, 0);
    const { error } = await db.from("modules").insert({ ...row, course_id: parsed.data.courseId, sort_order: sort });
    if (error) return { error: "The module could not be created." };
  }

  revalidatePath(`/admin/courses/${parsed.data.courseId}`);
  return { success: parsed.data.moduleId ? "Module saved." : "Module added." };
}

// ---------------------------------------------------------------- lessons

export async function saveLessonAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await requireAdmin();
  const parsed = z
    .object({
      courseId: uuid,
      moduleId: uuid,
      lessonId: z.union([z.literal(""), uuid]),
      title: z.string().trim().min(2, "Enter a lesson title.").max(160),
      description: z.string().trim().max(3000).optional(),
      status: z.enum(["draft", "published"], { error: "Choose draft or published." }),
    })
    .safeParse({
      courseId: formData.get("courseId"),
      moduleId: formData.get("moduleId"),
      lessonId: formData.get("lessonId") ?? "",
      title: formData.get("title"),
      description: formData.get("description") ?? "",
      status: formData.get("status"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the lesson details." };

  const streamUid = String(formData.get("streamUid") ?? "").trim();
  if (streamUid && !streamUidPattern.test(streamUid)) {
    return { error: "The Stream video id should contain only letters and numbers." };
  }
  if (parsed.data.status === "published" && !streamUid) {
    return { error: "Add the Cloudflare Stream video id before publishing this lesson." };
  }

  const duration = parseSeconds(String(formData.get("durationSeconds") ?? ""), "Duration");
  if (!duration.ok) return { error: duration.error };
  if (duration.value !== null && duration.value <= 0) return { error: "Duration must be more than 0 seconds." };

  const threshold = parseThresholdPercent(String(formData.get("completionPercent") ?? "90"));
  if (!threshold.ok) return { error: threshold.error };

  const sortRaw = String(formData.get("sortOrder") ?? "");
  const row = {
    title: parsed.data.title,
    description: parsed.data.description || null,
    stream_uid: streamUid || null,
    duration_seconds: duration.value,
    completion_threshold: threshold.value,
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.lessonId) {
    const { error } = await db
      .from("lessons")
      .update({ ...row, sort_order: parseSortOrder(sortRaw, 0) })
      .eq("id", parsed.data.lessonId)
      .eq("module_id", parsed.data.moduleId);
    if (error) return { error: "The lesson could not be saved." };
  } else {
    const sort = sortRaw.trim() === "" ? await nextSortOrder(db, "lessons", { column: "module_id", value: parsed.data.moduleId }) : parseSortOrder(sortRaw, 0);
    const { error } = await db.from("lessons").insert({ ...row, module_id: parsed.data.moduleId, sort_order: sort });
    if (error) return { error: "The lesson could not be created." };
  }

  revalidatePath(`/admin/courses/${parsed.data.courseId}`);
  return { success: parsed.data.lessonId ? "Lesson saved." : "Lesson added." };
}

// ---------------------------------------------------------------- quiz questions

// Admin-written quick check, shown during playback at the given second. Stored as approved.
export async function addQuestionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await requireAdmin();
  const parsed = z
    .object({
      courseId: uuid,
      lessonId: uuid,
      questionText: z.string().trim().min(5, "Write the question.").max(500),
      explanation: z.string().trim().max(500).optional(),
      correctIndex: z.coerce.number().int().min(0).max(3),
    })
    .safeParse({
      courseId: formData.get("courseId"),
      lessonId: formData.get("lessonId"),
      questionText: formData.get("questionText"),
      explanation: formData.get("explanation") ?? "",
      correctIndex: formData.get("correctIndex") ?? "0",
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the question." };

  const options = [0, 1, 2, 3]
    .map((i) => String(formData.get(`option${i}`) ?? "").trim())
    .filter((text) => text.length > 0)
    .map((text) => text.slice(0, 300));
  if (options.length < 2) return { error: "Add at least two answer options." };
  // The correct index refers to the option's position on the form, so map it through the filter.
  const rawOptions = [0, 1, 2, 3].map((i) => String(formData.get(`option${i}`) ?? "").trim());
  const correctText = rawOptions[parsed.data.correctIndex];
  if (!correctText) return { error: "Mark one of the answer options as correct." };
  const correctPosition = options.indexOf(correctText.slice(0, 300));

  const showAt = parseSeconds(String(formData.get("showAtSeconds") ?? ""), "Show time");
  if (!showAt.ok) return { error: showAt.error };
  const points = parseSortOrder(String(formData.get("points") ?? "1"), 1);
  if (points > 100) return { error: "Points must be between 0 and 100." };

  const { data: question, error } = await db
    .from("lesson_questions")
    .insert({
      lesson_id: parsed.data.lessonId,
      source: "admin",
      question_text: parsed.data.questionText,
      show_at_seconds: showAt.value,
      points,
      explanation: parsed.data.explanation || null,
      is_approved: true,
      sort_order: await nextSortOrder(db, "lesson_questions", { column: "lesson_id", value: parsed.data.lessonId }),
    })
    .select("id")
    .single();
  if (error || !question) return { error: "The question could not be saved." };

  const { error: optionError } = await db.from("question_options").insert(
    options.map((option_text, i) => ({
      question_id: question.id,
      option_text,
      is_correct: i === correctPosition,
      sort_order: i,
    })),
  );
  if (optionError) {
    await db.from("lesson_questions").delete().eq("id", question.id);
    return { error: "The answer options could not be saved, so the question was not added." };
  }

  revalidatePath(`/admin/courses/${parsed.data.courseId}`);
  return { success: "Question added." };
}

// ---------------------------------------------------------------- communities

export async function saveCommunityAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await requireAdmin();
  const parsed = z
    .object({
      communityId: z.union([z.literal(""), uuid]),
      name: z.string().trim().min(2, "Enter a community name.").max(80),
      description: z.string().trim().max(1000).optional(),
    })
    .safeParse({
      communityId: formData.get("communityId") ?? "",
      name: formData.get("name"),
      description: formData.get("description") ?? "",
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the community details." };

  const slug = slugFrom(formData.get("slug"), parsed.data.name);
  if (!slugPattern.test(slug)) return { error: "The URL name can only use lowercase letters, numbers and dashes." };

  const row = {
    slug,
    name: parsed.data.name,
    description: parsed.data.description || null,
    is_active: formData.get("isActive") === "on",
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.communityId) {
    const { error } = await db.from("communities").update(row).eq("id", parsed.data.communityId);
    if (error) return { error: isUniqueViolation(error) ? "Another community uses that URL name." : "The community could not be saved." };
    revalidatePath("/admin/communities");
    return { success: "Community saved." };
  }

  const { error } = await db.from("communities").insert(row);
  if (error) return { error: isUniqueViolation(error) ? "Another community uses that URL name." : "The community could not be created." };
  revalidatePath("/admin/communities");
  return { success: "Community created. Link it to plans from the Plans page." };
}
