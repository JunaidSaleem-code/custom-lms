import { test } from "node:test";
import assert from "node:assert/strict";
import {
  changePasswordSchema,
  emailSchema,
  loginSchema,
  passwordSchema,
  resetPasswordSchema,
} from "@/features/auth/schemas";
import { profileSchema } from "@/features/account/schemas";
import { lessonEventSchema, submitAnswerSchema, MAX_LESSON_SECONDS } from "@/features/courses/schemas";
import { signInErrorMessage, passwordUpdateErrorMessage, isRateLimited } from "@/features/auth/errors";

const firstIssue = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? null : r.error!.issues[0].message;

test("email is trimmed and lower-cased", () => {
  const r = emailSchema.safeParse("  Student@Example.COM ");
  assert.equal(r.success, true);
  assert.equal(r.success && r.data, "student@example.com");
});

test("invalid email is rejected with a friendly message", () => {
  assert.equal(firstIssue(emailSchema.safeParse("not-an-email")), "Enter a valid email address.");
  assert.equal(firstIssue(emailSchema.safeParse("   ")), "Enter your email address.");
});

test("password needs at least 10 characters", () => {
  assert.equal(firstIssue(passwordSchema.safeParse("short1")), "Use at least 10 characters.");
  assert.equal(passwordSchema.safeParse("long-enough").success, true);
});

test("password is limited to 72 bytes, counting multi-byte characters", () => {
  assert.equal(passwordSchema.safeParse("a".repeat(72)).success, true);
  assert.equal(firstIssue(passwordSchema.safeParse("a".repeat(73))), "Use at most 72 characters.");
  // 36 two-byte characters = 72 bytes (ok); 37 = 74 bytes (too long)
  assert.equal(passwordSchema.safeParse("é".repeat(36)).success, true);
  assert.equal(passwordSchema.safeParse("é".repeat(37)).success, false);
});

test("login requires a password but not a minimum length (checked at sign-up only)", () => {
  assert.equal(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success, true);
  assert.equal(firstIssue(loginSchema.safeParse({ email: "a@b.co", password: "" })), "Enter your password.");
});

test("reset password requires matching confirmation", () => {
  const r = resetPasswordSchema.safeParse({ password: "long-enough-1", confirm: "different-2" });
  assert.equal(firstIssue(r), "Passwords don't match.");
});

test("change password rejects reusing the current password", () => {
  const r = changePasswordSchema.safeParse({
    currentPassword: "same-password-1",
    password: "same-password-1",
    confirm: "same-password-1",
  });
  assert.equal(firstIssue(r), "Choose a password different from your current one.");
});

test("profile name must be 2 to 80 characters after trimming", () => {
  assert.equal(firstIssue(profileSchema.safeParse({ full_name: " A ", phone: "" })), "Enter your full name.");
  assert.equal(firstIssue(profileSchema.safeParse({ full_name: "a".repeat(81), phone: "" })), "Name must be 80 characters or fewer.");
});

test("profile phone is optional, validated when present, and empty becomes null", () => {
  const empty = profileSchema.safeParse({ full_name: "Ana Khan", phone: "" });
  assert.equal(empty.success && empty.data.phone, null);
  assert.equal(profileSchema.safeParse({ full_name: "Ana Khan", phone: "+92 300 1234567" }).success, true);
  assert.equal(firstIssue(profileSchema.safeParse({ full_name: "Ana Khan", phone: "call me" })), "Enter a valid phone number.");
});

test("lesson event rejects unknown types, negative positions and oversized deltas", () => {
  const base = { lessonId: "00000000-0000-4000-8000-000000000001", position: 10, watchedDelta: 5 };
  assert.equal(lessonEventSchema.safeParse({ ...base, eventType: "play" }).success, true);
  assert.equal(lessonEventSchema.safeParse({ ...base, eventType: "rewind" }).success, false);
  assert.equal(lessonEventSchema.safeParse({ ...base, eventType: "play", position: -1 }).success, false);
  assert.equal(lessonEventSchema.safeParse({ ...base, eventType: "play", position: MAX_LESSON_SECONDS + 1 }).success, false);
  assert.equal(lessonEventSchema.safeParse({ ...base, eventType: "heartbeat", watchedDelta: 61 }).success, false);
  assert.equal(lessonEventSchema.safeParse({ ...base, eventType: "play", lessonId: "not-a-uuid" }).success, false);
});

test("answer submission needs two valid ids", () => {
  const id = "00000000-0000-4000-8000-000000000002";
  assert.equal(submitAnswerSchema.safeParse({ questionId: id, optionId: id }).success, true);
  assert.equal(submitAnswerSchema.safeParse({ questionId: id }).success, false);
});

test("sign-in errors never reveal whether the account exists", () => {
  const msg = signInErrorMessage({ code: "invalid_credentials" });
  assert.match(msg, /incorrect/);
  assert.doesNotMatch(msg, /no account|not found|does not exist/i);
});

test("unconfirmed email and rate limit get their own messages", () => {
  assert.match(signInErrorMessage({ code: "email_not_confirmed" }), /isn.t confirmed yet/);
  assert.equal(signInErrorMessage({ status: 429 }), "Too many attempts. Wait a few minutes and try again.");
  assert.equal(isRateLimited({ code: "over_request_rate_limit" }), true);
});

test("unknown sign-in errors get a generic message", () => {
  assert.equal(signInErrorMessage({ code: "something_else" }), "We couldn't sign you in. Try again in a moment.");
});

test("password update error messages map known codes", () => {
  assert.match(passwordUpdateErrorMessage({ code: "same_password" }), /haven't used/);
  assert.match(passwordUpdateErrorMessage({ code: "weak_password" }), /too weak/);
  assert.equal(passwordUpdateErrorMessage({ code: "unexpected" }), "We couldn't update your password. Try again.");
});
