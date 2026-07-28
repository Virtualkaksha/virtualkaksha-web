import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import type { RoleName } from "@/app/generated/prisma/enums";

export const getCurrentSession = cache(async () => auth());

export const requireUser = cache(async () => {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user;
});

export async function requireRole(role: RoleName) {
  const user = await requireUser();

  if (!user.roles.includes(role)) {
    if (user.roles.includes("ADMIN")) redirect("/admin");
    if (user.roles.includes("TEACHER")) redirect("/teacher");
    redirect("/student");
  }

  return user;
}

export async function requireAnyRole(roles: RoleName[]) {
  const user = await requireUser();

  if (!roles.some((role) => user.roles.includes(role))) {
    redirect(user.roles.includes("ADMIN") ? "/admin" : "/student");
  }

  return user;
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
