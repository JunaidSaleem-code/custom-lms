import "server-only";
import { getPlaybackSource } from "@/lib/stream/token";
import type { PlaybackState } from "./components/lesson-player";

// Decides what the player can show for a lesson. Signed tokens are only issued after the lesson
// has passed the access check on the page (RLS), so this is never reachable for unentitled students.
export async function resolvePlayback(streamUid: string | null): Promise<PlaybackState> {
  if (!streamUid) return { ok: false, reason: "pending" };
  const result = await getPlaybackSource(streamUid);
  if (result.ok) return { ok: true, src: result.src };
  return { ok: false, reason: result.reason };
}
