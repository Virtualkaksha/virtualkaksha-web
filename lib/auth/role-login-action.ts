import type { LoginRole } from "@/lib/auth/role-routing";
import { resolveRolePostLoginRedirect } from "@/lib/auth/role-routing";
import { loginSchema } from "@/lib/auth/validation";

export type RoleLoginActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

type RequestedRedirect = {
  callbackUrl: string | null;
  applicationOrigin: string | null;
};

type RoleLoginActionDependencies = {
  signIn: (
    provider: "credentials",
    options: {
      email: string;
      password: string;
      expectedRole: LoginRole;
      redirect: false;
    },
  ) => Promise<unknown>;
  isAuthenticationError: (error: unknown) => boolean;
  redirect: (destination: string) => never;
};

export async function executeRoleLoginAction(
  expectedRole: LoginRole,
  formData: FormData,
  requestedRedirect: RequestedRedirect,
  dependencies: RoleLoginActionDependencies,
): Promise<RoleLoginActionState> {
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
    await dependencies.signIn("credentials", {
      ...parsed.data,
      expectedRole,
      redirect: false,
    });
  } catch (error) {
    if (dependencies.isAuthenticationError(error)) {
      return {
        status: "error",
        message: "The email or password is incorrect.",
      };
    }

    throw error;
  }

  dependencies.redirect(resolveRolePostLoginRedirect(
    expectedRole,
    requestedRedirect.callbackUrl,
    requestedRedirect.applicationOrigin,
  ));
}
