// Pure rules for lesson tracking and quiz timing. No React and no network, so they are unit-tested directly.
import { MAX_HEARTBEAT_DELTA } from "./schemas";

// A question fires slightly early rather than being missed when playback time is reported coarsely.
export const TIME_TOLERANCE_SECONDS = 0.5;

// Returns the first unanswered timed question that the playhead has reached, in video order.
export function findDueQuestion<T extends { id: string; showAtSeconds: number | null }>(
  questions: readonly T[],
  answeredIds: ReadonlySet<string> | Readonly<Record<string, unknown>>,
  position: number,
): T | null {
  const isAnswered = (id: string) =>
    answeredIds instanceof Set ? answeredIds.has(id) : Object.prototype.hasOwnProperty.call(answeredIds, id);

  let best: T | null = null;
  for (const q of questions) {
    if (q.showAtSeconds === null || isAnswered(q.id)) continue;
    if (q.showAtSeconds > position + TIME_TOLERANCE_SECONDS) continue;
    if (best === null || q.showAtSeconds < (best.showAtSeconds as number)) best = q;
  }
  return best;
}

// Watched time since the last saved position. Only forward progress counts, and each heartbeat is capped,
// so a seek or a stuck player can't inflate the total.
export function heartbeatDelta(position: number, savedPosition: number): number {
  const raw = position - savedPosition;
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(raw, MAX_HEARTBEAT_DELTA);
}

// Where to resume. Starting over is better than resuming a few seconds in or into the final seconds.
export const RESUME_MIN_SECONDS = 3;
export const RESUME_END_MARGIN_SECONDS = 5;

export function resumePosition(saved: number, durationSeconds: number | null): number {
  if (!Number.isFinite(saved) || saved < RESUME_MIN_SECONDS) return 0;
  if (durationSeconds !== null && saved >= durationSeconds - RESUME_END_MARGIN_SECONDS) return 0;
  return saved;
}
