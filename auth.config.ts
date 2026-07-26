import type { NextAuthConfig } from "next-auth";
import type { RoleName } from "@/app/generated/prisma/enums";

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
    maxAge: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const userId = auth?.user?.id;
      const roles = getRoles(auth?.user?.roles);
      const isAuthenticated = Boolean(userId);

      const isStudentRoute = nextUrl.pathname.startsWith("/student");
      const isAdminRoute = nextUrl.pathname.startsWith("/admin");
      const isAuthRoute =
        nextUrl.pathname === "/login" ||
        nextUrl.pathname === "/signup";

      if (isStudentRoute) {
        return isAuthenticated && roles.includes("STUDENT");
      }

      if (isAdminRoute) {
        return isAuthenticated && roles.includes("ADMIN");
      }

      if (isAuthRoute && isAuthenticated) {
        const destination = roles.includes("ADMIN")
          ? "/admin"
          : "/student";

        return Response.redirect(new URL(destination, nextUrl));
      }

      return true;
    },

    jwt({ token, user }) {
      if (user) {
        token.userId = String(user.id);
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

        session.user.roles = getRoles(token.roles);
      }

      return session;
    },
  },

  providers: [],
} satisfies NextAuthConfig;