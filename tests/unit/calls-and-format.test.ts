import { test } from "node:test";
import assert from "node:assert/strict";
import { callWindow, JOIN_EARLY_MINUTES, type CallRow } from "@/features/calls/status";
import { daysUntil, formatDuration, percent, plural } from "@/lib/format";

const start = new Date("2026-06-01T12:00:00Z");
const minutes = (m: number) => new Date(start.getTime() + m * 60_000);

const call = (overrides: Partial<CallRow> = {}): CallRow => ({
  id: "c1",
  title: "Group coaching",
  description: null,
  starts_at: start.toISOString(),
  duration_minutes: 60,
  join_url: "https://meet.example/abc",
  provider: null,
  ...overrides,
});

test("call before the join window is upcoming and not joinable", () => {
  const w = callWindow(call(), minutes(-(JOIN_EARLY_MINUTES + 5)));
  assert.equal(w.state, "upcoming");
  assert.equal(w.joinable, false);
});

test("join link opens exactly 15 minutes before the start", () => {
  assert.equal(callWindow(call(), minutes(-JOIN_EARLY_MINUTES)).joinable, true);
  assert.equal(callWindow(call(), minutes(-JOIN_EARLY_MINUTES - 0.1)).joinable, false);
});

test("call in progress is live and joinable", () => {
  const w = callWindow(call(), minutes(10));
  assert.equal(w.state, "live");
  assert.equal(w.joinable, true);
});

test("call that has ended is not joinable", () => {
  const w = callWindow(call(), minutes(61));
  assert.equal(w.state, "ended");
  assert.equal(w.joinable, false);
});

test("no join url means never joinable, even while live", () => {
  assert.equal(callWindow(call({ join_url: null }), minutes(10)).joinable, false);
});

test("endsAt is start plus duration", () => {
  assert.equal(callWindow(call({ duration_minutes: 90 }), minutes(0)).endsAt.getTime(), minutes(90).getTime());
});

test("formatDuration handles minutes, hours, and bad input", () => {
  assert.equal(formatDuration(75), "1:15");
  assert.equal(formatDuration(3725), "1:02:05");
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(-5), "0:00");
  assert.equal(formatDuration(Number.NaN), "0:00");
  assert.equal(formatDuration(null), "0:00");
  assert.equal(formatDuration(59.9), "0:59");
});

test("percent clamps and avoids division by zero", () => {
  assert.equal(percent(1, 3), 33);
  assert.equal(percent(5, 0), 0);
  assert.equal(percent(12, 10), 100);
  assert.equal(percent(-1, 10), 0);
  assert.equal(percent(Number.NaN, 10), 0);
});

test("daysUntil is ceiling-based and negative for past dates", () => {
  const now = new Date("2026-06-01T12:00:00Z");
  assert.equal(daysUntil("2026-06-04T12:00:00Z", now), 3);
  assert.equal(daysUntil("2026-06-04T11:00:00Z", now), 3);
  assert.equal(daysUntil("2026-05-30T12:00:00Z", now), -2);
});

test("plural picks the right form", () => {
  assert.equal(plural(1, "lesson"), "1 lesson");
  assert.equal(plural(0, "lesson"), "0 lessons");
  assert.equal(plural(2, "person", "people"), "2 people");
});
