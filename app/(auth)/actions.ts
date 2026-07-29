"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { Prisma } from "@/app/generated/prisma/client";

import { signIn, signOut } from "@/auth";
import { hashPassword } from "@/lib/auth/password";
import { resolvePostLoginRedirect } from "@/lib/auth/role-routing";
import { loginSchema, signupSchema } from "@/lib/auth/validation";
import { createStudentUser, findAuthUserByEmail } from "@/repositories/auth.repository";

export type AuthActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

async function getRequestedLoginRedirect(formData: FormData) {
  const requestHeaders = await headers();
  const referer = requestHeaders.get("referer");

  let applicationOrigin: string | null = null;
  let callbackUrl = formData.get("callbackUrl");

  if (referer) {
    try {
      const refererUrl = new URL(referer);

      applicationOrigin = refererUrl.origin;

      if (typeof callbackUrl !== "string" || !callbackUrl.trim()) {
        callbackUrl = refererUrl.searchParams.get("callbackUrl");
      }
    } catch {
      applicationOrigin = null;
    }
  }

  if (typeof callbackUrl !== "string" || !callbackUrl.trim()) {
    return { callbackUrl: null, applicationOrigin };
  }

  const normalizedCallbackUrl = callbackUrl.trim();

  // Allow internal relative URLs.
  if (
    normalizedCallbackUrl.startsWith("/") &&
    !normalizedCallbackUrl.startsWith("//")
  ) {
    return { callbackUrl: normalizedCallbackUrl, applicationOrigin };
  }

  // Allow absolute callback URLs only when they belong to this application.
  try {
    const parsedCallbackUrl = new URL(normalizedCallbackUrl);

    if (
      applicationOrigin &&
      parsedCallbackUrl.origin === applicationOrigin
    ) {
      return { callbackUrl: parsedCallbackUrl.toString(), applicationOrigin };
    }
  } catch {
    return { callbackUrl: null, applicationOrigin };
  }

  return { callbackUrl: null, applicationOrigin };
}

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

  const requestedRedirect = await getRequestedLoginRedirect(formData);

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "error",
        message: "The email or password is incorrect.",
      };
    }

    throw error;
  }

  const authenticatedUser = await findAuthUserByEmail(parsed.data.email);
  const roles = authenticatedUser?.status === "ACTIVE"
    ? authenticatedUser.roles.map(({ role }) => role.name)
    : [];

  redirect(resolvePostLoginRedirect(
    roles,
    requestedRedirect.callbackUrl,
    requestedRedirect.applicationOrigin,
  ));
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
