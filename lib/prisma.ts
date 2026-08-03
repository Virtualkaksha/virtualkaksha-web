import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

import { getDatabaseEnvironment, type EnvironmentSource } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

type PrismaDependencies = {
  createClient?: (configuration: {
    connectionString: string;
    log: Array<"warn" | "error">;
  }) => PrismaClient;
};

let cachedPrisma: PrismaClient | undefined;

function createPrismaClient({ connectionString, log }: {
  connectionString: string;
  log: Array<"warn" | "error">;
}) {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log,
  });
}

export function getPrismaClient(
  environment?: EnvironmentSource,
  dependencies: PrismaDependencies = {},
): PrismaClient {
  if (cachedPrisma) return cachedPrisma;
  const databaseEnvironment = getDatabaseEnvironment(environment);
  if (!databaseEnvironment.databaseUrl) {
    throw new Error("Database environment validation failed: DATABASE_URL is required before database use.");
  }
  if (databaseEnvironment.nodeEnv !== "production" && globalForPrisma.prisma) {
    cachedPrisma = globalForPrisma.prisma;
    return cachedPrisma;
  }

  const prisma = (dependencies.createClient ?? createPrismaClient)({
    connectionString: databaseEnvironment.databaseUrl,
    log: databaseEnvironment.nodeEnv === "development" ? ["warn", "error"] : ["error"],
  });
  cachedPrisma = prisma;
  if (databaseEnvironment.nodeEnv !== "production") globalForPrisma.prisma = prisma;
  return prisma;
}

export function resetPrismaClientForTests() {
  cachedPrisma = undefined;
}

const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default prisma;
