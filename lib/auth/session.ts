import "server-only";

import { cache } from "react";

import { auth } from "@/auth";
import type { RoleName } from "@/app/generated/prisma/enums";
import {
  requireAnyCurrentRole,
  requireCurrentRole,
  requireCurrentUser,
} from "@/lib/auth/current-identity";

export const getCurrentSession = cache(async () => auth());

/** @deprecated Use requireCurrentUser directly at new security boundaries. */
export const requireUser = cache(() => requireCurrentUser());

/** @deprecated Use requireCurrentRole directly at new security boundaries. */
export async function requireRole(role: RoleName) {
  return requireCurrentRole(role);
}

/** @deprecated Use requireAnyCurrentRole directly at new security boundaries. */
export async function requireAnyRole(roles: RoleName[]) {
  return requireAnyCurrentRole(roles);
}

export function requireStudent() {
  return requireRole("STUDENT");
}

export function requireTeacher() {
  return requireAnyRole(["TEACHER", "ADMIN"]);
}

export function requireAdmin() {
  return requireRole("ADMIN");
}
