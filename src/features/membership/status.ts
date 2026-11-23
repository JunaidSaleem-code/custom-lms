// Turns a student's enrollment rows into one membership state for the UI.
// Pure function: no database access, so every edge case can be tested directly.
import { daysUntil } from "@/lib/format";

export type EnrollmentRow = {
  status: "active" | "expired" | "revoked" | "refunded";
  starts_at: string;
  expires_at: string | null;
  plans: { name: string } | null;
};

export const EXPIRING_SOON_DAYS = 7;

export type MembershipState =
  | { kind: "active"; planName: string; expiresAt: string | null }
  | { kind: "expiring"; planName: string; expiresAt: string; daysLeft: number }
  | { kind: "upcoming"; planName: string; startsAt: string }
  | { kind: "expired"; planName: string; expiredAt: string }
  | { kind: "ended"; planName: string }
  | { kind: "none" };

export function deriveMembershipState(rows: EnrollmentRow[], now: Date = new Date()): MembershipState {
  const nowMs = now.getTime();
  const planName = (r: EnrollmentRow) => r.plans?.name ?? "Membership";

  // 1) Currently valid: status active, started, and not past its end date.
  const current = rows
    .filter(
      (r) =>
        r.status === "active" &&
        new Date(r.starts_at).getTime() <= nowMs &&
        (r.expires_at === null || new Date(r.expires_at).getTime() > nowMs),
    )
    // Lifetime (null expiry) wins; otherwise the latest end date.
    .sort((a, b) => {
      if (a.expires_at === null) return -1;
      if (b.expires_at === null) return 1;
      return new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime();
    });

  const best = current[0];
  if (best) {
    if (best.expires_at === null) {
      return { kind: "active", planName: planName(best), expiresAt: null };
    }
    const daysLeft = daysUntil(best.expires_at, now);
    if (daysLeft <= EXPIRING_SOON_DAYS) {
      return { kind: "expiring", planName: planName(best), expiresAt: best.expires_at, daysLeft };
    }
    return { kind: "active", planName: planName(best), expiresAt: best.expires_at };
  }

  // 2) Purchased, but the start date is still in the future.
  const upcoming = rows
    .filter((r) => r.status === "active" && new Date(r.starts_at).getTime() > nowMs)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];
  if (upcoming) {
    return { kind: "upcoming", planName: planName(upcoming), startsAt: upcoming.starts_at };
  }

  // 3) Most recent enrollment has run out by date.
  const lastExpired = rows
    .filter((r) => r.expires_at !== null && new Date(r.expires_at).getTime() <= nowMs)
    .sort((a, b) => new Date(b.expires_at!).getTime() - new Date(a.expires_at!).getTime())[0];
  if (lastExpired && lastExpired.status !== "revoked" && lastExpired.status !== "refunded") {
    return { kind: "expired", planName: planName(lastExpired), expiredAt: lastExpired.expires_at! };
  }

  // 4) Revoked or refunded by the business.
  const ended = rows.find((r) => r.status === "revoked" || r.status === "refunded");
  if (ended) return { kind: "ended", planName: planName(ended) };

  // 5) Nothing found: payment not yet synced, or no membership at all.
  return { kind: "none" };
}
