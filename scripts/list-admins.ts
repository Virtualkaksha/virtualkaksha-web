import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is missing.");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const admins = await prisma.user.findMany({
      where: { roles: { some: { role: { name: "ADMIN" } } } },
      select: {
        email: true,
        displayName: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(`Current admins (${admins.length}):`);
    for (const admin of admins) {
      console.log(` - ${admin.email} | ${admin.displayName} | ${admin.status}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
