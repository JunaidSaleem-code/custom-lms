import { test } from "node:test";
import assert from "node:assert/strict";
import { hasAdminAccess } from "@/features/admin/access";
import { churnRate, completionRate, funnelCounts, retentionRate, weekdayActivity } from "@/features/admin/analytics";

test("only the admin role gets admin access", () => {
  assert.equal(hasAdminAccess({ role: "admin" }), true);
  assert.equal(hasAdminAccess({ role: "student" }), false);
  assert.equal(hasAdminAccess({ role: "" }), false);
  assert.equal(hasAdminAccess(null), false);
  assert.equal(hasAdminAccess(undefined), false);
});

test("weekday activity counts Monday first and ignores bad timestamps", () => {
  // 2026-06-01 is a Monday, 2026-06-06 is a Saturday, 2026-06-07 is a Sunday (UTC)
  const counts = weekdayActivity([
    "2026-06-01T10:00:00Z",
    "2026-06-01T23:00:00Z",
    "2026-06-06T08:00:00Z",
    "2026-06-07T08:00:00Z",
    "not-a-date",
  ]);
  assert.deepEqual(counts, [2, 0, 0, 0, 0, 1, 1]);
});

test("retention counts students active in the last 7 days", () => {
  const now = new Date("2026-06-10T12:00:00Z");
  const rate = retentionRate(
    ["2026-06-09T00:00:00Z", "2026-06-01T00:00:00Z", null, "2026-06-10T11:00:00Z"],
    now,
  );
  assert.equal(rate, 50);
});

test("retention is zero with no students", () => {
  assert.equal(retentionRate([], new Date()), 0);
});

test("completion rate is a clamped percentage with no division by zero", () => {
  assert.equal(completionRate(3, 4), 75);
  assert.equal(completionRate(0, 0), 0);
  assert.equal(completionRate(9, 4), 100);
});

test("churn counts memberships that ended in the window against those active at its start", () => {
  const now = new Date("2026-06-30T00:00:00Z");
  const enrollments = [
    // active at start (1 Jun), ended 10 Jun: churned
    { starts_at: "2026-05-01T00:00:00Z", expires_at: "2026-06-10T00:00:00Z", status: "active" },
    // active at start, still running: kept
    { starts_at: "2026-05-01T00:00:00Z", expires_at: "2026-08-01T00:00:00Z", status: "active" },
    // active at start, refunded: churned
    { starts_at: "2026-05-01T00:00:00Z", expires_at: "2026-08-01T00:00:00Z", status: "refunded" },
    // started after the window began: not in the base
    { starts_at: "2026-06-15T00:00:00Z", expires_at: null, status: "active" },
  ];
  assert.equal(churnRate(enrollments, now, 30), 67);
});

test("churn is zero when nobody was active at the start", () => {
  assert.equal(churnRate([], new Date("2026-06-30T00:00:00Z")), 0);
});

test("funnel counts invited, registered and enrolled students", () => {
  const counts = funnelCounts([
    { invited: true, confirmed: true, enrolled: true },
    { invited: true, confirmed: false, enrolled: false },
    { invited: false, confirmed: true, enrolled: false },
  ]);
  assert.deepEqual(counts, { invited: 2, registered: 2, enrolled: 1 });
});
