import type { RoleName } from "@/app/generated/prisma/enums";

export type LoginRole = "STUDENT" | "TEACHER" | "ADMIN";

export function getRoleHome(roles: readonly RoleName[]) {
  if (roles.includes("ADMIN")) return "/admin";
  if (roles.includes("TEACHER")) return "/teacher";
  if (roles.includes("STUDENT")) return "/student";
  return "/";
}

export const ROLE_LOGIN_CONFIG = Object.freeze({
  STUDENT: { loginPath: "/login", homePath: "/student" },
  TEACHER: { loginPath: "/teacher/login", homePath: "/teacher" },
  ADMIN: { loginPath: "/admin/login", homePath: "/admin" },
} satisfies Record<LoginRole, { loginPath: string; homePath: string }>);

function loginRoleForPath(pathname: string): LoginRole | null {
  if (pathname === "/login") return "STUDENT";
  if (pathname === "/teacher/login") return "TEACHER";
  if (pathname === "/admin/login") return "ADMIN";
  return null;
}

/** Published free catalogue and PDF viewers stay open without a student session. */
export function isPublicStudentResourcePath(pathname: string) {
  return pathname === "/student/resources" || pathname.startsWith("/student/resources/");
}

export function getAuthenticatedRouteRedirect(
  pathname: string,
  isAuthenticated: boolean,
  roles: readonly RoleName[],
) {
  const loginRole = loginRoleForPath(pathname);
  const isSignupRoute = pathname === "/signup";
  const requiredArea = pathname.startsWith("/admin/") || pathname === "/admin"
    ? "ADMIN"
    : pathname.startsWith("/teacher/") || pathname === "/teacher"
      ? "TEACHER"
      : pathname.startsWith("/student/") || pathname === "/student"
        ? "STUDENT"
        : null;

  if (loginRole) {
    return isAuthenticated && roles.includes(loginRole)
      ? ROLE_LOGIN_CONFIG[loginRole].homePath
      : null;
  }
  if (isSignupRoute) {
    // Student signup stays on the marketing funnel. Only existing students skip it.
    return isAuthenticated && roles.includes("STUDENT")
      ? ROLE_LOGIN_CONFIG.STUDENT.homePath
      : null;
  }

  if (!requiredArea) return null;

  // Guests may browse and open free published study resources without signing in.
  if (!isAuthenticated && requiredArea === "STUDENT" && isPublicStudentResourcePath(pathname)) {
    return null;
  }

  if (!isAuthenticated) return ROLE_LOGIN_CONFIG[requiredArea].loginPath;

  const hasAccess = roles.includes(requiredArea);

  return hasAccess ? null : getRoleHome(roles);
}

export function resolveRolePostLoginRedirect(
  expectedRole: LoginRole,
  callbackUrl?: string | null,
  applicationOrigin?: string | null,
) {
  const roleHome = ROLE_LOGIN_CONFIG[expectedRole].homePath;
  const candidate = callbackUrl?.trim();
  if (!candidate) return roleHome;

  let destination: URL;
  try {
    if (candidate.startsWith("/") && !candidate.startsWith("//")) {
      destination = new URL(candidate, "https://virtualkaksha.internal");
    } else {
      destination = new URL(candidate);
      if (!applicationOrigin || destination.origin !== applicationOrigin) return roleHome;
    }
  } catch {
    return roleHome;
  }

  const permitted = destination.pathname === roleHome
    || destination.pathname.startsWith(`${roleHome}/`);
  return permitted
    ? `${destination.pathname}${destination.search}${destination.hash}`
    : roleHome;
}

export function resolvePostLoginRedirect(
  roles: readonly RoleName[],
  callbackUrl?: string | null,
  applicationOrigin?: string | null,
) {
  const roleHome = getRoleHome(roles);
  const candidate = callbackUrl?.trim();
  if (!candidate) return roleHome;

  let destination: URL;
  try {
    if (candidate.startsWith("/") && !candidate.startsWith("//")) {
      destination = new URL(candidate, "https://virtualkaksha.internal");
    } else {
      destination = new URL(candidate);
      if (!applicationOrigin || destination.origin !== applicationOrigin) {
        return roleHome;
      }
    }
  } catch {
    return roleHome;
  }

  if (destination.pathname === "/login" || destination.pathname === "/signup") {
    return roleHome;
  }

  if (getAuthenticatedRouteRedirect(destination.pathname, true, roles)) {
    return roleHome;
  }

  return `${destination.pathname}${destination.search}${destination.hash}`;
}
