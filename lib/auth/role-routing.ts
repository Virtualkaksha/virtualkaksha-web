import type { RoleName } from "@/app/generated/prisma/enums";

export function getRoleHome(roles: readonly RoleName[]) {
  if (roles.includes("ADMIN")) return "/admin";
  if (roles.includes("TEACHER")) return "/teacher";
  if (roles.includes("STUDENT")) return "/student";
  return "/";
}

export function getAuthenticatedRouteRedirect(
  pathname: string,
  isAuthenticated: boolean,
  roles: readonly RoleName[],
) {
  const isLoginRoute = pathname === "/login" || pathname === "/signup";
  const requiredArea = pathname.startsWith("/admin")
    ? "ADMIN"
    : pathname.startsWith("/teacher")
      ? "TEACHER"
      : pathname.startsWith("/student")
        ? "STUDENT"
        : null;

  if (isLoginRoute) {
    return isAuthenticated ? getRoleHome(roles) : null;
  }

  if (!requiredArea) return null;
  if (!isAuthenticated) return "/login";

  const hasAccess = requiredArea === "TEACHER"
    ? roles.includes("TEACHER") || roles.includes("ADMIN")
    : roles.includes(requiredArea);

  return hasAccess ? null : getRoleHome(roles);
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
