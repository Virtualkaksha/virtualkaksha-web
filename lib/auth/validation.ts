import { z } from "zod";
import { DEFAULT_STUDENT_BOARD_SLUG, STUDENT_BOARD_SLUGS, STUDENT_CLASS_SLUGS } from "@/lib/students/class-options";

export const passwordSchema = z
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
    board: z.enum(STUDENT_BOARD_SLUGS).default(DEFAULT_STUDENT_BOARD_SLUG),
    classLevel: z.enum(STUDENT_CLASS_SLUGS, {
      error: "Select your class.",
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const studentProfileSchema = z.object({
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
});

export const changeStudentPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "Choose a password that is different from your current one.",
    path: ["newPassword"],
  });
