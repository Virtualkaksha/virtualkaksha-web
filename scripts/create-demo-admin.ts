import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { hashPassword } from "../lib/auth/password";

const email = "admin@virtualkaksha.local";
const password = "Admin@1234";

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
    const adminRole = await prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: { name: "ADMIN" },
    });

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          firstName: "Platform",
          lastName: "Admin",
          displayName: "Platform Admin",
          email,
          passwordHash,
          status: "ACTIVE",
          roles: { create: { roleId: adminRole.id } },
        },
      });
      console.log("Created admin user:", email);
    } else {
      await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, status: "ACTIVE" },
      });
      await prisma.userRole.createMany({
        data: [{ userId: existing.id, roleId: adminRole.id }],
        skipDuplicates: true,
      });
      console.log("Updated existing admin user:", email);
    }

    console.log("Login with:");
    console.log("  email:", email);
    console.log("  password:", password);
    console.log("  url: http://localhost:3001/admin/login");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
