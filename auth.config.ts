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

export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

export const authConfig = {
  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    // Revocation is database-enforced; a one-day ceiling limits an unused JWT.
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
    updateAge: 60 * 60,
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
        name: secureCookies ? "__Host-authjs.session-token" : "authjs.session-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: secureCookies,
          maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
        },
      },
    },
    basePath: configuredPath === "/" ? "/api/auth" : configuredPath,
  };
}
