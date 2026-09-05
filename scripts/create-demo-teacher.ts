import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { hashPassword } from "../lib/auth/password";

const email = "teacher@virtualkaksha.local";
const password = "Teacher@1234";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const passwordHash = await hashPassword(password);
    const teacherRole = await prisma.role.upsert({
      where: { name: "TEACHER" },
      update: {},
      create: { name: "TEACHER" },
    });

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          firstName: "Demo",
          lastName: "Teacher",
          displayName: "Demo Teacher",
          email,
          passwordHash,
          status: "ACTIVE",
          roles: { create: { roleId: teacherRole.id } },
          teacherProfile: {
            create: {
              headline: "Demo teacher account",
              verificationStatus: "VERIFIED",
              profileStatus: "PUBLISHED",
            },
          },
        },
      });
      console.log("Created teacher user:", email);
    } else {
      await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, status: "ACTIVE" },
      });
      await prisma.userRole.createMany({
        data: [{ userId: existing.id, roleId: teacherRole.id }],
        skipDuplicates: true,
      });
      await prisma.teacherProfile.upsert({
        where: { userId: existing.id },
        update: {
          verificationStatus: "VERIFIED",
          profileStatus: "PUBLISHED",
        },
        create: {
          userId: existing.id,
          headline: "Demo teacher account",
          verificationStatus: "VERIFIED",
          profileStatus: "PUBLISHED",
        },
      });
      console.log("Updated existing teacher user:", email);
    }

    console.log("Login with:");
    console.log("  email:", email);
    console.log("  password:", password);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
