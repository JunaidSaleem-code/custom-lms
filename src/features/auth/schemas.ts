import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 10;
// bcrypt (used by Supabase Auth) only uses the first 72 bytes of a password.
const PASSWORD_MAX_BYTES = 72;

const trimmedLower = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : v);

export const emailSchema = z.preprocess(
  trimmedLower,
  z
    .string({ error: "Enter your email address." })
    .min(1, "Enter your email address.")
    .max(254, "Email address is too long.")
    .email("Enter a valid email address."),
);

export const passwordSchema = z
  .string({ error: "Enter a password." })
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .refine(
    (p) => new TextEncoder().encode(p).length <= PASSWORD_MAX_BYTES,
    "Use at most 72 characters.",
  );

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords don't match.",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords don't match.",
  })
  .refine((d) => d.password !== d.currentPassword, {
    path: ["password"],
    message: "Choose a password different from your current one.",
  });


export const signUpSchema = z
  .object({
    fullName: z
      .string({ error: "Enter your full name." })
      .trim()
      .min(2, "Enter your full name.")
      .max(80, "Name must be 80 characters or fewer."),
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords don't match.",
  });
