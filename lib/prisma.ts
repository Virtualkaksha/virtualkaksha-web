import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

import { installPostgresDnsFallback } from "@/lib/db/postgres-dns";
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

/** Keep this list in sync with critical schema models so hot-reload cannot reuse a stale client. */
const REQUIRED_MODEL_DELEGATES = [
  "user",
  "resource",
  "teacherAccessRequest",
  "practiceQuestion",
  "practiceTestAttempt",
] as const;

function createPrismaClient({ connectionString, log }: {
  connectionString: string;
  log: Array<"warn" | "error">;
}) {
  installPostgresDnsFallback();
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      connectionTimeoutMillis: 20_000,
    }),
    log,
  });
}

function isCompatiblePrismaClient(client: PrismaClient) {
  return REQUIRED_MODEL_DELEGATES.every((delegateName) => {
    const delegate = Reflect.get(client, delegateName) as
      | { findFirst?: unknown; findUnique?: unknown }
      | undefined;
    return Boolean(
      delegate
      && (typeof delegate.findFirst === "function" || typeof delegate.findUnique === "function"),
    );
  });
}

export function getPrismaClient(
  environment?: EnvironmentSource,
  dependencies: PrismaDependencies = {},
): PrismaClient {
  if (cachedPrisma && isCompatiblePrismaClient(cachedPrisma)) return cachedPrisma;
  const databaseEnvironment = getDatabaseEnvironment(environment);
  if (!databaseEnvironment.databaseUrl) {
    throw new Error("Database environment validation failed: DATABASE_URL is required before database use.");
  }
  if (
    databaseEnvironment.nodeEnv !== "production"
    && globalForPrisma.prisma
    && isCompatiblePrismaClient(globalForPrisma.prisma)
  ) {
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
  globalForPrisma.prisma = undefined;
}

const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default prisma;
