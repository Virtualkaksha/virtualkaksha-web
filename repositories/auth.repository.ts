import prisma from "@/lib/prisma";

export type AuthUserRecord = Awaited<ReturnType<typeof findAuthUserByEmail>>;

export function findAuthUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
      avatarUrl: true,
      passwordHash: true,
      sessionVersion: true,
      status: true,
      roles: {
        select: {
          role: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
}

export async function createStudentUser(input: {
  firstName: string;
  lastName?: string;
  email: string;
  passwordHash: string;
  classLevelSlug: string;
  boardSlug?: string;
}) {
  const boardSlug = input.boardSlug?.trim() || "cbse";
  const [board, classLevel] = await Promise.all([
    prisma.board.findFirst({
      where: { slug: boardSlug, isActive: true },
      select: { id: true },
    }),
    prisma.classLevel.findFirst({
      where: { slug: input.classLevelSlug, isActive: true },
      select: { id: true },
    }),
  ]);

  if (!board || !classLevel) {
    throw Object.assign(new Error("CLASS_SCOPE_UNAVAILABLE"), { code: "CLASS_SCOPE_UNAVAILABLE" });
  }

  return prisma.$transaction(async (tx) => {
    const studentRole = await tx.role.upsert({
      where: {
        name: "STUDENT",
      },
      update: {},
      create: {
        name: "STUDENT",
      },
      select: {
        id: true,
      },
    });

    return tx.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName || null,
        displayName: [input.firstName, input.lastName].filter(Boolean).join(" "),
        email: input.email,
        passwordHash: input.passwordHash,
        status: "ACTIVE",
        roles: {
          create: {
            roleId: studentRole.id,
          },
        },
        studentProfile: {
          create: {
            boardId: board.id,
            classLevelId: classLevel.id,
          },
        },
      },
      select: {
        id: true,
        email: true,
      },
    });
  });
}

export function markUserLogin(userId: string) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      lastLoginAt: new Date(),
    },
    select: {
      id: true,
    },
  });
}
