import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseAccessDays,
  parseSeconds,
  parseSortOrder,
  parseThresholdPercent,
  slugify,
  splitByStart,
} from "@/features/admin/input";
import { eventLabel, membershipBadge, percentOfLesson } from "@/features/admin/labels";

test("slugify makes URL-safe names from titles", () => {
  assert.equal(slugify("Basic Course (2026)"), "basic-course-2026");
  assert.equal(slugify("  Café  Séance!  "), "cafe-seance");
  assert.equal(slugify("---"), "");
});

test("blank access duration means no expiry, otherwise whole days from 1 to 3650", () => {
  assert.deepEqual(parseAccessDays(""), { ok: true, value: null });
  assert.deepEqual(parseAccessDays(" 90 "), { ok: true, value: 90 });
  assert.equal(parseAccessDays("0").ok, false);
  assert.equal(parseAccessDays("2.5").ok, false);
  assert.equal(parseAccessDays("3651").ok, false);
  assert.equal(parseAccessDays("abc").ok, false);
});

test("completion threshold is entered as a percentage and stored as a fraction", () => {
  assert.deepEqual(parseThresholdPercent("90"), { ok: true, value: 0.9 });
  assert.deepEqual(parseThresholdPercent("100"), { ok: true, value: 1 });
  assert.equal(parseThresholdPercent("0").ok, false);
  assert.equal(parseThresholdPercent("101").ok, false);
});

test("sort order falls back when blank or invalid", () => {
  assert.equal(parseSortOrder("", 7), 7);
  assert.equal(parseSortOrder("3", 7), 3);
  assert.equal(parseSortOrder("-1", 7), 7);
  assert.equal(parseSortOrder("1.5", 7), 7);
});

test("seconds fields accept blank (not set), numbers, and reject negatives", () => {
  assert.deepEqual(parseSeconds("", "Duration"), { ok: true, value: null });
  assert.deepEqual(parseSeconds("12.345", "Duration"), { ok: true, value: 12.35 });
  assert.equal(parseSeconds("-3", "Duration").ok, false);
});

test("splitByStart separates upcoming and past calls using the given clock", () => {
  const now = Date.parse("2026-06-10T12:00:00Z");
  const calls = [
    { id: "a", starts_at: "2026-06-12T10:00:00Z" },
    { id: "b", starts_at: "2026-06-01T10:00:00Z" },
    { id: "c", starts_at: "2026-06-11T10:00:00Z" },
  ];
  const { upcoming, past } = splitByStart(calls, now);
  assert.deepEqual(upcoming.map((c) => c.id), ["c", "a"]);
  assert.deepEqual(past.map((c) => c.id), ["b"]);
});

test("membership badges use the plan name and warn when expiry is close", () => {
  assert.deepEqual(membershipBadge({ kind: "active", planName: "Full", expiresAt: null }), { label: "Full", tone: "success" });
  assert.deepEqual(membershipBadge({ kind: "expiring", planName: "Full", expiresAt: "x", daysLeft: 1 }), {
    label: "Full: ends in 1 day",
    tone: "warning",
  });
  assert.equal(membershipBadge({ kind: "none" }).label, "No membership");
});

test("event names are readable and unknown events are shown as-is", () => {
  assert.equal(eventLabel("ended"), "Reached the end");
  assert.equal(eventLabel("mystery"), "mystery");
});

test("lesson percentage is clamped and unknown without a length", () => {
  assert.equal(percentOfLesson(30, 60), 50);
  assert.equal(percentOfLesson(90, 60), 100);
  assert.equal(percentOfLesson(10, null), null);
  assert.equal(percentOfLesson(10, 0), null);
});
