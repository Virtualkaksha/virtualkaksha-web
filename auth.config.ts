import type { NextAuthConfig } from "next-auth";
import type { RoleName } from "@/app/generated/prisma/enums";
import { getAuthenticatedRouteRedirect } from "@/lib/auth/role-routing";
import { getAuthEnvironment, type EnvironmentSource } from "@/lib/env";

function getRoles(value: unknown): RoleName[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (role): role is RoleName =>
      role === "STUDENT" ||
      role === "ADMIN" ||
      role === "TEACHER",
  );
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    // Revocation is database-enforced; a seven-day ceiling also limits exposure of an unused JWT.
    maxAge: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const userId = auth?.user?.id;
      const roles = getRoles(auth?.user?.roles);
      const isAuthenticated = Boolean(userId);

      const destination = getAuthenticatedRouteRedirect(
        nextUrl.pathname,
        isAuthenticated,
        roles,
      );

      return destination
        ? Response.redirect(new URL(destination, nextUrl))
        : true;
    },

    jwt({ token, user }) {
      if (user) {
        token.userId = String(user.id);
        token.sessionVersion = user.sessionVersion;
        // JWT roles are navigation hints only. Server authorization must use current database roles.
        token.roles = getRoles(user.roles);
      }

      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id =
          typeof token.userId === "string"
            ? token.userId
            : String(token.sub ?? "");

        if (Number.isSafeInteger(token.sessionVersion) && Number(token.sessionVersion) > 0) {
          session.user.sessionVersion = Number(token.sessionVersion);
        }
        // Session roles remain temporarily for Stage 1 compatibility and are not authoritative.
        session.user.roles = getRoles(token.roles);
      }

      return session;
    },
  },

  providers: [],
} satisfies NextAuthConfig;

export function createAuthRuntimeConfig(
  environment?: EnvironmentSource,
): NextAuthConfig {
  const validated = getAuthEnvironment(environment);
  const secureCookies = validated.nodeEnv === "production";
  const configuredPath = validated.authUrl ? new URL(validated.authUrl).pathname : "/";
  return {
    ...authConfig,
    ...(validated.authSecret ? { secret: validated.authSecret } : {}),
    ...(validated.authTrustHost === undefined ? {} : { trustHost: validated.authTrustHost }),
    useSecureCookies: secureCookies,
    cookies: {
      sessionToken: {
        name: secureCookies ? "__Secure-authjs.session-token" : "authjs.session-token",
        options: { httpOnly: true, sameSite: "lax", path: "/", secure: secureCookies },
      },
    },
    basePath: configuredPath === "/" ? "/api/auth" : configuredPath,
  };
}
