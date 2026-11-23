import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveMembershipState, type EnrollmentRow, type MembershipState } from "@/features/membership/status";

export type AuthUserInfo = {
  id: string;
  email: string;
  invited_at: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
};

// Every auth user, paginated. Used for email addresses and the invite funnel.
export async function listAuthUsers(db: SupabaseClient): Promise<Map<string, AuthUserInfo>> {
  const map = new Map<string, AuthUserInfo>();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Could not load accounts: ${error.message}`);
    for (const u of data.users) {
      map.set(u.id, {
        id: u.id,
        email: u.email ?? "",
        invited_at: u.invited_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
      });
    }
    if (data.users.length < 1000) break;
  }
  return map;
}

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  membership: MembershipState;
  activePlanIds: string[];
  lastActive: string | null;
  invitedNotActivated: boolean;
};

export async function listStudents(
  db: SupabaseClient,
  filters: { planId?: string; query?: string } = {},
): Promise<StudentRow[]> {
  const [profiles, enrollments, users] = await Promise.all([
    db.from("profiles").select("id, full_name, last_active_at, role").eq("role", "student"),
    db.from("enrollments").select("user_id, plan_id, status, starts_at, expires_at, plans(name)"),
    listAuthUsers(db),
  ]);
  if (profiles.error) throw new Error(profiles.error.message);
  if (enrollments.error) throw new Error(enrollments.error.message);

  type E = EnrollmentRow & { user_id: string; plan_id: string };
  const byUser = new Map<string, E[]>();
  for (const e of (enrollments.data ?? []) as unknown as E[]) {
    byUser.set(e.user_id, [...(byUser.get(e.user_id) ?? []), e]);
  }

  const q = filters.query?.trim().toLowerCase() ?? "";
  const rows: StudentRow[] = (profiles.data ?? []).map((p) => {
    const user = users.get(p.id);
    const rowsForUser = byUser.get(p.id) ?? [];
    const active = rowsForUser.filter((e) => e.status === "active");
    return {
      id: p.id,
      name: p.full_name ?? "",
      email: user?.email ?? "",
      membership: deriveMembershipState(rowsForUser),
      activePlanIds: active.map((e) => e.plan_id),
      lastActive: p.last_active_at,
      invitedNotActivated: Boolean(user?.invited_at) && !user?.email_confirmed_at,
    };
  });

  return rows
    .filter((r) => !filters.planId || r.activePlanIds.includes(filters.planId))
    .filter((r) => !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getStudentDetail(db: SupabaseClient, id: string) {
  const [profile, enrollments, progress, events, attempts, points, certs, users] = await Promise.all([
    db.from("profiles").select("id, full_name, phone, role, last_active_at, created_at").eq("id", id).maybeSingle(),
    db.from("enrollments").select("id, plan_id, status, starts_at, expires_at, source, plans(name)").eq("user_id", id).order("starts_at", { ascending: false }),
    db.from("lesson_progress").select("last_position_seconds, furthest_position_seconds, watched_seconds, completed_at, first_interaction_at, last_event_at, lessons(title, duration_seconds, modules(title, courses(title)))").eq("user_id", id).order("last_event_at", { ascending: false }),
    db.from("lesson_events").select("event_type, position_seconds, occurred_at, lessons(title)").eq("user_id", id).order("occurred_at", { ascending: false }).limit(25),
    db.from("question_attempts").select("is_correct, points_awarded").eq("user_id", id),
    db.from("user_points").select("total_points").eq("user_id", id).maybeSingle(),
    db.from("certificates").select("certificate_number, issued_at, courses(title)").eq("user_id", id),
    listAuthUsers(db),
  ]);
  for (const r of [profile, enrollments, progress, events, attempts, points, certs]) {
    if (r.error) throw new Error(r.error.message);
  }
  if (!profile.data) return null;

  const user = users.get(id);
  const attemptRows = attempts.data ?? [];
  return {
    profile: profile.data,
    email: user?.email ?? "",
    invitedAt: user?.invited_at ?? null,
    confirmedAt: user?.email_confirmed_at ?? null,
    lastSignIn: user?.last_sign_in_at ?? null,
    enrollments: enrollments.data ?? [],
    progress: progress.data ?? [],
    events: events.data ?? [],
    quiz: {
      answered: attemptRows.length,
      correct: attemptRows.filter((a) => a.is_correct).length,
    },
    points: Number(points.data?.total_points ?? 0),
    certificates: certs.data ?? [],
  };
}
