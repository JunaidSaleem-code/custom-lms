import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveMembershipState, type EnrollmentRow } from "@/features/membership/status";

const NOW = new Date("2026-06-01T12:00:00Z");
const day = 24 * 60 * 60 * 1000;
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString();

function row(partial: Partial<EnrollmentRow> & { plan?: string }): EnrollmentRow {
  return {
    status: "active",
    starts_at: at(-30 * day),
    expires_at: at(60 * day),
    plans: { name: partial.plan ?? "Full Course" },
    ...partial,
  };
}

test("no enrollments means no membership", () => {
  assert.deepEqual(deriveMembershipState([], NOW), { kind: "none" });
});

test("active with a future expiry is active", () => {
  const s = deriveMembershipState([row({})], NOW);
  assert.equal(s.kind, "active");
});

test("lifetime access (no expiry) is active and wins over dated plans", () => {
  const s = deriveMembershipState([row({ expires_at: at(3 * day) }), row({ expires_at: null, plans: { name: "Inner Circle" } })], NOW);
  assert.equal(s.kind, "active");
  assert.equal((s as { planName: string }).planName, "Inner Circle");
});

test("expires within 7 days shows expiring with days left", () => {
  const s = deriveMembershipState([row({ expires_at: at(3 * day) })], NOW);
  assert.equal(s.kind, "expiring");
  assert.equal((s as { daysLeft: number }).daysLeft, 3);
});

test("expiring boundary: exactly 7 days is expiring, 8 days is active", () => {
  assert.equal(deriveMembershipState([row({ expires_at: at(7 * day - 1000) })], NOW).kind, "expiring");
  assert.equal(deriveMembershipState([row({ expires_at: at(8 * day) })], NOW).kind, "active");
});

test("status active but past its end date is expired, not active", () => {
  const s = deriveMembershipState([row({ starts_at: at(-100 * day), expires_at: at(-1 * day) })], NOW);
  assert.equal(s.kind, "expired");
});

test("expiry exactly at now counts as expired", () => {
  const s = deriveMembershipState([row({ starts_at: at(-100 * day), expires_at: NOW.toISOString() })], NOW);
  assert.equal(s.kind, "expired");
});

test("future start date is upcoming", () => {
  const s = deriveMembershipState([row({ starts_at: at(2 * day), expires_at: at(90 * day) })], NOW);
  assert.equal(s.kind, "upcoming");
});

test("a renewal that starts later does not hide current access", () => {
  const s = deriveMembershipState(
    [row({ starts_at: at(-30 * day), expires_at: at(20 * day) }), row({ starts_at: at(20 * day), expires_at: at(110 * day) })],
    NOW,
  );
  assert.equal(s.kind, "active");
});

test("revoked membership shows ended, not expired", () => {
  const s = deriveMembershipState([row({ status: "revoked", expires_at: at(30 * day) })], NOW);
  assert.equal(s.kind, "ended");
});

test("refunded membership shows ended", () => {
  const s = deriveMembershipState([row({ status: "refunded", expires_at: at(30 * day) })], NOW);
  assert.equal(s.kind, "ended");
});

test("most recent expired enrollment is reported when several have ended", () => {
  const s = deriveMembershipState(
    [
      row({ starts_at: at(-200 * day), expires_at: at(-100 * day), plans: { name: "Basic" } }),
      row({ starts_at: at(-100 * day), expires_at: at(-10 * day), plans: { name: "Full" } }),
    ],
    NOW,
  );
  assert.equal(s.kind, "expired");
  assert.equal((s as { planName: string }).planName, "Full");
});

test("missing plan name falls back to a generic label", () => {
  const s = deriveMembershipState([row({ plans: null, expires_at: null })], NOW);
  assert.equal((s as { planName: string }).planName, "Membership");
});
