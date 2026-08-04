"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { registerStudentAccount } from "@/lib/auth/signup-service";
import { logOutAllSessions } from "@/lib/auth/account-security";
import { executeRoleLoginAction, type RoleLoginActionState } from "@/lib/auth/role-login-action";
import { signupSchema } from "@/lib/auth/validation";
import type { LoginRole } from "@/lib/auth/role-routing";

export type AuthActionState = RoleLoginActionState;

function requestFromHeaders(requestHeaders: Headers) {
  return new Request("http://rate-limit.internal", { headers: requestHeaders });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function logoutAllSessionsAction(): Promise<AuthActionState | void> {
  const result = await logOutAllSessions();
  if (!result.ok) {
    return { status: "error", message: result.message };
  }
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

async function loginForRoleAction(
  expectedRole: LoginRole,
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const requestedRedirect = await getRequestedLoginRedirect(formData);
  return executeRoleLoginAction(
    expectedRole,
    formData,
    requestedRedirect,
    {
      signIn,
      isAuthenticationError: (error) => error instanceof AuthError,
      redirect,
    },
  );
}

export async function studentLoginAction(previousState: AuthActionState, formData: FormData) {
  return await loginForRoleAction("STUDENT", previousState, formData);
}

export async function teacherLoginAction(previousState: AuthActionState, formData: FormData) {
  return await loginForRoleAction("TEACHER", previousState, formData);
}

export async function adminLoginAction(previousState: AuthActionState, formData: FormData) {
  return await loginForRoleAction("ADMIN", previousState, formData);
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
    guardianAcknowledgement: formData.get("guardianAcknowledgement"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await registerStudentAccount({
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName || undefined,
    email: parsed.data.email,
    password: parsed.data.password,
    request: requestFromHeaders(await headers()),
  });
  if (!result.accepted) {
    return {
      status: "error",
      message: "Too many requests. Please try again later.",
    };
  }
  redirect("/login?signup=received");
}
