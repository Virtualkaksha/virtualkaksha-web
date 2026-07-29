import type { Prisma } from "@/app/generated/prisma/client";

export function buildBoardClassSubjectWhere(
  boardSlug: string,
  classSlug: string | undefined,
): Prisma.BoardClassSubjectWhereInput | null {
  const normalizedClassSlug = classSlug?.trim();

  if (!normalizedClassSlug) {
    return null;
  }

  return {
    isActive: true,
    board: { slug: boardSlug, isActive: true },
    classLevel: { slug: normalizedClassSlug, isActive: true },
    subject: { isActive: true },
  };
}
