import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters.")
  .max(72, "Password cannot exceed 72 characters.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.");

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").toLowerCase(),
  password: z.string().min(1, "Enter your password."),
});

export const signupSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "First name must contain at least 2 characters.")
      .max(50, "First name is too long."),
    lastName: z
      .string()
      .trim()
      .max(50, "Last name is too long.")
      .optional()
      .or(z.literal("")),
    email: z.string().trim().email("Enter a valid email address.").toLowerCase(),
    password: passwordSchema,
    confirmPassword: z.string(),
    guardianAcknowledgement: z.literal("on", {
      error: "Please confirm the age or parent/guardian permission requirement.",
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
