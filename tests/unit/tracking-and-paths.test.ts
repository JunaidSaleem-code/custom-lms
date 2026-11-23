import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findDueQuestion,
  heartbeatDelta,
  resumePosition,
  RESUME_END_MARGIN_SECONDS,
  RESUME_MIN_SECONDS,
} from "@/features/courses/tracking";
import { safeNextPath } from "@/lib/navigation/safe-path";

const q = (id: string, showAtSeconds: number | null) => ({ id, showAtSeconds });

test("question is due when the playhead reaches its timestamp", () => {
  const qs = [q("a", 30)];
  assert.equal(findDueQuestion(qs, new Set(), 29), null);
  assert.equal(findDueQuestion(qs, new Set(), 30)?.id, "a");
});

test("question fires up to half a second early, not earlier", () => {
  const qs = [q("a", 30)];
  assert.equal(findDueQuestion(qs, new Set(), 29.5)?.id, "a");
  assert.equal(findDueQuestion(qs, new Set(), 29.4), null);
});

test("answered questions never fire again", () => {
  const qs = [q("a", 30)];
  assert.equal(findDueQuestion(qs, new Set(["a"]), 45), null);
  assert.equal(findDueQuestion(qs, { a: { isCorrect: true } }, 45), null);
});

test("skipped question fires once the student seeks past it", () => {
  const qs = [q("a", 30), q("b", 90)];
  assert.equal(findDueQuestion(qs, new Set(), 100)?.id, "a");
});

test("several due questions come out in video order", () => {
  const qs = [q("late", 60), q("early", 20)];
  assert.equal(findDueQuestion(qs, new Set(), 100)?.id, "early");
});

test("questions without a timestamp are never timed", () => {
  assert.equal(findDueQuestion([q("end", null)], new Set(), 9999), null);
});

test("heartbeat counts forward progress only", () => {
  assert.equal(heartbeatDelta(45, 30), 15);
  assert.equal(heartbeatDelta(20, 30), 0, "a backward seek adds no time");
  assert.equal(heartbeatDelta(30, 30), 0);
  assert.equal(heartbeatDelta(Number.NaN, 30), 0);
});

test("heartbeat is capped so a long gap cannot inflate watch time", () => {
  assert.equal(heartbeatDelta(600, 0), 60);
});

test("resume starts from the saved position when it is in the middle", () => {
  assert.equal(resumePosition(120, 600), 120);
});

test("resume starts over when the student only just started", () => {
  assert.equal(resumePosition(RESUME_MIN_SECONDS - 0.1, 600), 0);
});

test("resume starts over when the student was in the final seconds", () => {
  assert.equal(resumePosition(600 - RESUME_END_MARGIN_SECONDS + 1, 600), 0);
});

test("resume works when duration is unknown", () => {
  assert.equal(resumePosition(120, null), 120);
  assert.equal(resumePosition(Number.NaN, null), 0);
});

test("safeNextPath allows same-site relative paths", () => {
  assert.equal(safeNextPath("/learn/courses"), "/learn/courses");
  assert.equal(safeNextPath("/learn?tab=2"), "/learn?tab=2");
});

test("safeNextPath blocks open redirects and falls back", () => {
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "learn", "", null, undefined]) {
    assert.equal(safeNextPath(bad as string | null | undefined), "/learn", `should block ${String(bad)}`);
  }
});

test("safeNextPath blocks control characters", () => {
  assert.equal(safeNextPath("/learn\nSet-Cookie:x"), "/learn");
});
