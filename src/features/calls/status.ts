// Timing rules for group calls. Pure functions so the edge cases are easy to test.

export type CallRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  join_url: string | null;
  provider: string | null;
};

// The join link is shown from this long before the start until the call ends.
export const JOIN_EARLY_MINUTES = 15;

export type CallWindow = {
  state: "upcoming" | "live" | "ended";
  endsAt: Date;
  // True when the join link should be shown (and a join_url exists).
  joinable: boolean;
};

export function callWindow(call: CallRow, now: Date = new Date()): CallWindow {
  const start = new Date(call.starts_at).getTime();
  const end = start + call.duration_minutes * 60_000;
  const t = now.getTime();

  let state: CallWindow["state"];
  if (t < start) state = "upcoming";
  else if (t <= end) state = "live";
  else state = "ended";

  const joinOpens = start - JOIN_EARLY_MINUTES * 60_000;
  const joinable = Boolean(call.join_url) && t >= joinOpens && t <= end;

  return { state, endsAt: new Date(end), joinable };
}
