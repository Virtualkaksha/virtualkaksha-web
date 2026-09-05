import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters.")
  .max(72, "Password cannot exceed 72 characters.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.");

export const teacherAccessRequestSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "First name must contain at least 2 characters.")
      .max(50, "First name is too long."),
    lastName: z.string().trim().max(50, "Last name is too long.").optional().or(z.literal("")),
    email: z.string().trim().email("Enter a valid email address.").toLowerCase(),
    phone: z.string().trim().max(20, "Phone number is too long.").optional().or(z.literal("")),
    city: z.string().trim().max(80, "City is too long.").optional().or(z.literal("")),
    subjects: z
      .string()
      .trim()
      .min(3, "Tell us which subjects or classes you teach.")
      .max(300, "Subjects text is too long."),
    experienceYears: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((value) => !value || (/^\d{1,2}$/.test(value) && Number(value) <= 50), {
        message: "Enter experience in years between 0 and 50.",
      }),
    message: z.string().trim().max(1000, "Message is too long.").optional().or(z.literal("")),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type TeacherAccessRequestInput = z.infer<typeof teacherAccessRequestSchema>;
