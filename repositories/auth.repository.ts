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
}) {
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
          create: {},
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
