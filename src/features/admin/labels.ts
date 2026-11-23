// Display labels for admin pages. Pure functions: no database or server-only imports.
import type { MembershipState } from "@/features/membership/status";

type Tone = "neutral" | "brand" | "success" | "warning";

export function membershipBadge(state: MembershipState): { label: string; tone: Tone } {
  switch (state.kind) {
    case "active":
      return { label: state.planName, tone: "success" };
    case "expiring":
      return { label: `${state.planName}: ends in ${state.daysLeft} day${state.daysLeft === 1 ? "" : "s"}`, tone: "warning" };
    case "upcoming":
      return { label: `${state.planName}: starts later`, tone: "brand" };
    case "expired":
      return { label: "Expired", tone: "neutral" };
    case "ended":
      return { label: "Ended", tone: "neutral" };
    case "none":
      return { label: "No membership", tone: "neutral" };
  }
}

export function statusBadge(status: "draft" | "published"): { label: string; tone: Tone } {
  return status === "published" ? { label: "Published", tone: "success" } : { label: "Draft", tone: "neutral" };
}

export function enrollmentStatusBadge(status: string): { label: string; tone: Tone } {
  switch (status) {
    case "active":
      return { label: "Active", tone: "success" };
    case "expired":
      return { label: "Expired", tone: "neutral" };
    case "revoked":
      return { label: "Ended by admin", tone: "warning" };
    case "refunded":
      return { label: "Refunded", tone: "warning" };
    default:
      return { label: status, tone: "neutral" };
  }
}

// Turns a stored event name into words for the activity list.
export function eventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    play: "Pressed play",
    pause: "Paused",
    seek: "Jumped to a new point",
    heartbeat: "Still watching",
    ended: "Reached the end",
  };
  return labels[eventType] ?? eventType;
}

// Share of a lesson reached, 0..100. Null when the length isn't known yet.
export function percentOfLesson(seconds: number, durationSeconds: number | null | undefined): number | null {
  if (!durationSeconds || durationSeconds <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((seconds / durationSeconds) * 100)));
}
