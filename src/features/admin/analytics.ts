// Pure analytics calculations for the admin overview. No database access, so they are unit-tested directly.
// Weekdays use UTC, so results don't change with the server's timezone.

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

// Counts events per weekday, Monday first.
export function weekdayActivity(timestamps: readonly string[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const t of timestamps) {
    const d = new Date(t).getUTCDay(); // 0 = Sunday
    if (Number.isNaN(d)) continue;
    counts[(d + 6) % 7] += 1;
  }
  return counts;
}

// Share of students who were active within the last `days` days.
export function retentionRate(lastActive: readonly (string | null)[], now: Date, days = 7): number {
  if (lastActive.length === 0) return 0;
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  const active = lastActive.filter((t) => t !== null && new Date(t).getTime() >= cutoff).length;
  return percentOf(active, lastActive.length);
}

// Lesson completion: completed lesson records as a share of all lessons students could complete.
export function completionRate(completed: number, possible: number): number {
  return percentOf(completed, possible);
}

// Churn over a window: memberships that ended in the window, as a share of memberships active at the start.
// This is an approximation based on enrollment dates. It is documented in docs/PLACEHOLDERS.md.
export type EnrollmentDates = {
  starts_at: string;
  expires_at: string | null;
  status: string;
  ended_at?: string | null;
};

export function churnRate(enrollments: readonly EnrollmentDates[], now: Date, windowDays = 30): number {
  const end = now.getTime();
  const start = end - windowDays * 24 * 60 * 60 * 1000;
  const activeAtStart = enrollments.filter((e) => {
    const s = new Date(e.starts_at).getTime();
    const x = e.expires_at ? new Date(e.expires_at).getTime() : Infinity;
    return s <= start && x > start;
  }).length;
  const endedInWindow = enrollments.filter((e) => {
    if (!e.expires_at) return false;
    const x = new Date(e.expires_at).getTime();
    const endedSoon = x > start && x <= end;
    const revoked = e.status === "revoked" || e.status === "refunded";
    return endedSoon || revoked;
  }).length;
  return percentOf(endedInWindow, activeAtStart);
}

export type FunnelCounts = { invited: number; registered: number; enrolled: number };

// Invited -> registered (activated password) -> enrolled (has an active membership).
export function funnelCounts(users: readonly { invited: boolean; confirmed: boolean; enrolled: boolean }[]): FunnelCounts {
  return {
    invited: users.filter((u) => u.invited).length,
    registered: users.filter((u) => u.confirmed).length,
    enrolled: users.filter((u) => u.enrolled).length,
  };
}

function percentOf(part: number, total: number): number {
  if (!total || total <= 0 || !Number.isFinite(part)) return 0;
  return Math.min(100, Math.max(0, Math.round((part / total) * 100)));
}
