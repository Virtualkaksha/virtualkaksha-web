import { pathToFileURL } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { hashPassword } from "../lib/auth/password";
import { loginSchema, passwordSchema } from "../lib/auth/validation";

const PLACEHOLDER_EMAIL = /@(example\.com|example\.org|test\.invalid|virtualkaksha\.local)$/i;

export type AdminBootstrapInput = {
  email: string;
  password: string;
  resetPassword: boolean;
};

export function resolveAdminBootstrapInput(
  arguments_: string[],
  environment: NodeJS.ProcessEnv,
): AdminBootstrapInput {
  if (!arguments_.includes("--confirm")) {
    throw new Error("Pass --confirm after setting ADMIN_EMAIL and ADMIN_PASSWORD.");
  }
  if (environment.NODE_ENV === "production" && environment.ADMIN_BOOTSTRAP !== "true") {
    throw new Error("Production bootstrap also requires ADMIN_BOOTSTRAP=true.");
  }

  const parsedEmail = loginSchema.shape.email.safeParse(environment.ADMIN_EMAIL);
  if (!parsedEmail.success || PLACEHOLDER_EMAIL.test(parsedEmail.data)) {
    throw new Error("Set ADMIN_EMAIL to a real mailbox you control.");
  }

  const parsedPassword = passwordSchema.safeParse(environment.ADMIN_PASSWORD);
  if (!parsedPassword.success) {
    throw new Error("Set ADMIN_PASSWORD to a strong password (8+ characters, upper, lower, number).");
  }

  return {
    email: parsedEmail.data,
    password: parsedPassword.data,
    resetPassword: arguments_.includes("--reset-password"),
  };
}

export async function main(arguments_ = process.argv.slice(2), environment = process.env): Promise<void> {
  const input = resolveAdminBootstrapInput(arguments_, environment);
  const connectionString = environment.DATABASE_URL;
  if (!connectionString) throw new Error("Database configuration is unavailable.");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const passwordHash = await hashPassword(input.password);
    const adminRole = await prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: { name: "ADMIN" },
    });

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          firstName: "Platform",
          lastName: "Admin",
          displayName: "Platform Admin",
          email: input.email,
          passwordHash,
          status: "ACTIVE",
          roles: { create: { roleId: adminRole.id } },
        },
      });
      console.log("Administrator account created. Sign in at /login/admin, then remove bootstrap secrets from the environment.");
      return;
    }

    const assigned = await prisma.userRole.createMany({
      data: [{ userId: existing.id, roleId: adminRole.id }],
      skipDuplicates: true,
    });

    if (input.resetPassword) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, status: "ACTIVE", sessionVersion: { increment: 1 } },
      });
      console.log("Administrator credentials rotated and existing sessions were revoked. Remove bootstrap secrets from the environment.");
      return;
    }

    if (assigned.count > 0) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { sessionVersion: { increment: 1 } },
      });
      console.log("Administrator role assigned; existing sessions were revoked.");
      return;
    }

    console.log("Administrator account already exists; credentials were left unchanged.");
  } finally {
    await prisma.$disconnect();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  import("dotenv/config")
    .then(() => main())
    .catch(() => {
      console.error("Administrator bootstrap failed.");
      process.exitCode = 1;
    });
}
