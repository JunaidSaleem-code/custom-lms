import { test } from "node:test";
import assert from "node:assert/strict";
import { signUpSchema } from "@/features/auth/schemas";
import { signUpErrorMessage, signInErrorMessage } from "@/features/auth/errors";

const valid = { fullName: "Ana Khan", email: "ana@example.com", password: "long-enough-1", confirm: "long-enough-1" };

test("sign-up accepts a valid form and normalises the email", () => {
  const r = signUpSchema.safeParse({ ...valid, email: " Ana@Example.com " });
  assert.equal(r.success, true);
  assert.equal(r.success && r.data.email, "ana@example.com");
});

test("sign-up requires a name of at least 2 characters", () => {
  assert.equal(signUpSchema.safeParse({ ...valid, fullName: " A " }).success, false);
});

test("sign-up rejects mismatched passwords", () => {
  const r = signUpSchema.safeParse({ ...valid, confirm: "other-password-2" });
  assert.equal(r.success, false);
});

test("sign-up enforces the password length rule", () => {
  assert.equal(signUpSchema.safeParse({ ...valid, password: "short", confirm: "short" }).success, false);
});

test("sign-up errors map known codes and stay generic otherwise", () => {
  assert.match(signUpErrorMessage({ code: "signup_disabled" }), /Sign-up is closed/);
  assert.match(signUpErrorMessage({ status: 429 }), /Too many attempts/);
  assert.equal(signUpErrorMessage({ code: "email_address_invalid" }), "Enter a valid email address.");
  assert.equal(signUpErrorMessage({ code: "unknown" }), "We couldn't create your account. Try again in a moment.");
});

test("invited students who never set a password get a pointer to the reset flow", () => {
  assert.match(signInErrorMessage({ code: "invalid_credentials" }), /Forgot your password/);
});

test("unconfirmed sign-in points to the confirmation email and resend", () => {
  assert.match(signInErrorMessage({ code: "email_not_confirmed" }), /ask for a new one/);
});
