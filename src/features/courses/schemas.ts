import { z } from "zod";

const uuid = z.uuid({ error: "Invalid id." });

// Server-side limits for tracking input. Values outside these are rejected, not clamped silently.
export const MAX_LESSON_SECONDS = 24 * 60 * 60;
export const MAX_HEARTBEAT_DELTA = 60;

export const lessonEventSchema = z.object({
  lessonId: uuid,
  eventType: z.enum(["play", "pause", "seek", "heartbeat", "ended"]),
  position: z.number().finite().min(0).max(MAX_LESSON_SECONDS),
  watchedDelta: z.number().finite().min(0).max(MAX_HEARTBEAT_DELTA),
});

export const submitAnswerSchema = z.object({
  questionId: uuid,
  optionId: uuid,
});
