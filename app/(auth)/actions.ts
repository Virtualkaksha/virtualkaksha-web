"use server";

import { AuthError } from "next-auth";
import { Prisma } from "@/app/generated/prisma/client";

import { signIn } from "@/auth";
import { hashPassword } from "@/lib/auth/password";
import { loginSchema, signupSchema } from "@/lib/auth/validation";
import { createStudentUser } from "@/repositories/auth.repository";

export type AuthActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: "/student",
    });

    return {
      status: "idle",
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "error",
        message: "The email or password is incorrect.",
      };
    }

    throw error;
  }
}

export async function signupAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createStudentUser({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName || undefined,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        status: "error",
        message: "An account with this email already exists.",
        fieldErrors: {
          email: ["Use a different email or sign in instead."],
        },
      };
    }

    throw error;
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/student",
    });

    return {
      status: "idle",
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "error",
        message: "Your account was created. Please sign in.",
      };
    }

    throw error;
  }
}
