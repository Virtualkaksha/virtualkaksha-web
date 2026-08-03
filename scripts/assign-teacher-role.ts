import "dotenv/config";

import { pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { createAccountSecurityRepository } from "../repositories/account-security.repository";

function readConfirmedEmail(arguments_: string[]) {
  const email = arguments_.find((value) => value !== "--confirm")?.trim().toLowerCase();
  const placeholder = !email || !email.includes("@") || /@(example\.com|example\.org|test\.invalid)$/i.test(email);
  if (placeholder || !arguments_.includes("--confirm")) {
    throw new Error("Provide a valid account email and --confirm.");
  }
  return email;
}

export async function main(arguments_ = process.argv.slice(2), environment = process.env): Promise<void> {
  const email = readConfirmedEmail(arguments_);
  const connectionString = environment.DATABASE_URL;
  if (!connectionString) throw new Error("Database configuration is unavailable.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) throw new Error("The requested account or role is unavailable.");
    const result = await createAccountSecurityRepository(prisma).changeRole(user.id, "TEACHER", "add");
    if (result.outcome === "not-found") throw new Error("The requested account or role is unavailable.");
    console.log(result.outcome === "changed" ? "Teacher role assigned; existing sessions were revoked." : "Teacher role was already assigned; no change was made.");
  } finally {
    await prisma.$disconnect();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  main().catch(() => {
    console.error("Teacher role assignment failed.");
    process.exitCode = 1;
  });
}
