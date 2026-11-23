import { z } from "zod";

export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(80, "Name must be 80 characters or fewer."),
  phone: z
    .string()
    .trim()
    .max(20, "Phone number is too long.")
    .refine((v) => v === "" || /^\+?[0-9 ()-]{7,20}$/.test(v), "Enter a valid phone number.")
    .transform((v) => (v === "" ? null : v)),
});
