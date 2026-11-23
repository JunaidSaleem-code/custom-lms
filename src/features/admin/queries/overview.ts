import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listAuthUsers } from "./students";
import {
  churnRate,
  completionRate,
  funnelCounts,
  retentionRate,
  weekdayActivity,
  WEEKDAYS,
  type EnrollmentDates,
} from "../analytics";

// Numbers for the admin overview. Calculations live in analytics.ts; this file only gathers rows.
export async function getOverview(db: SupabaseClient, now = new Date()) {
  const since90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const [students, enrollments, events, progress, lessons, users] = await Promise.all([
    db.from("profiles").select("id, last_active_at").eq("role", "student"),
    db.from("enrollments").select("user_id, plan_id, status, starts_at, expires_at"),
    db.from("lesson_events").select("occurred_at").gte("occurred_at", since90).limit(20000),
    db.from("lesson_progress").select("user_id").not("completed_at", "is", null),
    db.from("lessons").select("id").eq("status", "published"),
    listAuthUsers(db),
  ]);
  for (const r of [students, enrollments, events, progress, lessons]) {
    if (r.error) throw new Error(r.error.message);
  }

  const studentRows = students.data ?? [];
  const enrollmentRows = (enrollments.data ?? []) as (EnrollmentDates & { user_id: string; plan_id: string })[];
  const nowMs = now.getTime();
  const activeNow = enrollmentRows.filter(
    (e) =>
      e.status === "active" &&
      new Date(e.starts_at).getTime() <= nowMs &&
      (e.expires_at === null || new Date(e.expires_at).getTime() > nowMs),
  );
  const enrolledUsers = new Set(activeNow.map((e) => e.user_id));

  const funnel = funnelCounts(
    studentRows.map((s) => {
      const u = users.get(s.id);
      return {
        invited: Boolean(u?.invited_at),
        confirmed: Boolean(u?.email_confirmed_at),
        enrolled: enrolledUsers.has(s.id),
      };
    }),
  );

  const counts = weekdayActivity((events.data ?? []).map((e) => e.occurred_at));

  const possibleLessons = studentRows.length * (lessons.data?.length ?? 0);
  const completedLessons = progress.data?.length ?? 0;

  return {
    totalStudents: studentRows.length,
    activeMemberships: activeNow.length,
    funnel,
    retention7d: retentionRate(studentRows.map((s) => s.last_active_at), now, 7),
    churn30d: churnRate(enrollmentRows, now, 30),
    completion: completionRate(completedLessons, possibleLessons),
    weekdays: WEEKDAYS.map((label, i) => ({ label, count: counts[i] })),
    lastActiveSorted: studentRows
      .filter((s) => s.last_active_at)
      .sort((a, b) => String(b.last_active_at).localeCompare(String(a.last_active_at)))
      .slice(0, 8),
  };
}
