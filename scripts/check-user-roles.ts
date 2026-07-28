import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email || !process.env.DATABASE_URL) {
    throw new Error("Email or DATABASE_URL missing.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
  });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        email: true,
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

    console.log(JSON.stringify(user, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});