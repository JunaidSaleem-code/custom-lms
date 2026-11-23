// Pure formatting helpers. Keep them free of React and of server-only imports so they are easy to test.

// 75 -> "1:15", 3725 -> "1:02:05". Non-finite or negative input shows as "0:00".
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

// Percentage clamped to 0..100. Returns 0 when the total is zero, so empty courses don't show NaN.
export function percent(part: number, total: number): number {
  if (!total || total <= 0 || !Number.isFinite(part)) return 0;
  return Math.min(100, Math.max(0, Math.round((part / total) * 100)));
}

// Whole days from `now` until `iso`. Negative when the date has already passed.
export function daysUntil(iso: string, now: Date = new Date()): number {
  const ms = new Date(iso).getTime() - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}
