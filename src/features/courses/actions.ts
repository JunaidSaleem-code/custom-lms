"use server";

import { requireUser } from "@/features/auth/session";
import type { ActionResult } from "@/lib/action-result";
import { lessonEventSchema, submitAnswerSchema } from "./schemas";

// Called by the lesson player for every play, pause, seek, heartbeat and end event.
// The database function re-checks access and caps watched time, so this layer only validates shape.
export async function recordLessonEventAction(input: unknown): Promise<ActionResult> {
  const parsed = lessonEventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid progress update." };

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("record_lesson_event", {
    p_lesson_id: parsed.data.lessonId,
    p_event_type: parsed.data.eventType,
    p_position: parsed.data.position,
    p_watched_delta: parsed.data.watchedDelta,
  });

  if (error) {
    if (error.code === "42501") return { ok: false, error: "You no longer have access to this lesson." };
    return { ok: false, error: "Progress could not be saved. It will retry automatically." };
  }
  return { ok: true };
}

export type AnswerOutcome = {
  isCorrect: boolean;
  pointsAwarded: number;
  alreadyAnswered: boolean;
};

// Answers are scored on the server. The correct option is never sent to the browser.
export async function submitAnswerAction(input: unknown): Promise<ActionResult<AnswerOutcome>> {
  const parsed = submitAnswerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose an answer before continuing." };

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.rpc("submit_question_answer", {
    p_question_id: parsed.data.questionId,
    p_option_id: parsed.data.optionId,
  });

  if (error) {
    // A question can only be scored once. Return the stored result instead of an error.
    if (error.message.includes("already answered")) {
      const { data: prior } = await supabase
        .from("question_attempts")
        .select("is_correct, points_awarded")
        .eq("user_id", user.id)
        .eq("question_id", parsed.data.questionId)
        .maybeSingle();
      return {
        ok: true,
        data: {
          isCorrect: prior?.is_correct ?? false,
          pointsAwarded: prior?.points_awarded ?? 0,
          alreadyAnswered: true,
        },
      };
    }
    if (error.code === "42501") return { ok: false, error: "You no longer have access to this question." };
    if (error.message.includes("invalid option")) return { ok: false, error: "That option isn't valid for this question." };
    return { ok: false, error: "Your answer could not be saved. Try again." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    ok: true,
    data: {
      isCorrect: Boolean(row?.is_correct),
      pointsAwarded: Number(row?.points_awarded ?? 0),
      alreadyAnswered: false,
    },
  };
}
