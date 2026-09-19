import "server-only";

import { redirect } from "next/navigation";

import { getCurrentIdentity } from "@/lib/auth/current-identity";
import prisma from "@/lib/prisma";
import { studentCatalogueHome } from "@/lib/students/class-options";

export { applyClassScopeToSearchQuery } from "@/lib/students/class-options";

export type StudentClassScope = {
  boardId: string;
  boardSlug: string;
  boardName: string;
  classLevelId: string;
  classSlug: string;
  className: string;
};

export async function getStudentClassScope(userId: string): Promise<StudentClassScope | null> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: {
      board: { select: { id: true, slug: true, shortName: true, isActive: true } },
      classLevel: { select: { id: true, slug: true, name: true, isActive: true } },
    },
  });
  if (!profile?.board?.isActive || !profile.classLevel?.isActive) return null;
  return {
    boardId: profile.board.id,
    boardSlug: profile.board.slug,
    boardName: profile.board.shortName,
    classLevelId: profile.classLevel.id,
    classSlug: profile.classLevel.slug,
    className: profile.classLevel.name,
  };
}

export async function getCurrentStudentClassScope(): Promise<StudentClassScope | null> {
  const identity = await getCurrentIdentity();
  if (!identity?.roles.includes("STUDENT")) return null;
  return getStudentClassScope(identity.id);
}

export async function redirectStudentToOwnClass(current?: {
  boardSlug?: string;
  classSlug?: string;
}) {
  const scope = await getCurrentStudentClassScope();
  if (!scope) return;

  const home = studentCatalogueHome(scope.boardSlug, scope.classSlug);
  const boardMatches = !current?.boardSlug || current.boardSlug === scope.boardSlug;
  const classMatches = current?.classSlug === scope.classSlug;
  if (!boardMatches || !classMatches) {
    redirect(home);
  }
}
