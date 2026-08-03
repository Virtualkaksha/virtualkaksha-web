import "dotenv/config";

import { pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

function readEmail(arguments_: string[]) {
  const email = arguments_[0]?.trim().toLowerCase();
  if (!email || !email.includes("@") || /@(example\.com|example\.org|test\.invalid)$/i.test(email)) {
    throw new Error("Provide a valid account email.");
  }
  return email;
}

export async function main(arguments_ = process.argv.slice(2), environment = process.env): Promise<void> {
  const email = readEmail(arguments_);
  const connectionString = environment.DATABASE_URL;
  if (!connectionString) throw new Error("Database configuration is unavailable.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { roles: { select: { role: { select: { name: true } } } } },
    });
    if (!user) throw new Error("The requested account is unavailable.");
    const roles = user.roles.map(({ role }) => role.name).sort();
    console.log(roles.length ? `Assigned roles: ${roles.join(", ")}.` : "No roles are assigned.");
  } finally {
    await prisma.$disconnect();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error("Role inspection failed.");
    process.exitCode = 1;
  });
}
