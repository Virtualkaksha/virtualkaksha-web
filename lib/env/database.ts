import "server-only";

import { z } from "zod";

import {
  environmentError,
  optionalValue,
  parseRuntimeEnvironment,
  rejectPlaceholder,
  rejectPlaceholderUrl,
  type EnvironmentSource,
  type RuntimeEnvironment,
} from "./common";

export type DatabaseEnvironment = Readonly<{
  nodeEnv: RuntimeEnvironment;
  databaseUrl?: string;
}>;

const databaseUrlSchema = z.string().url();
let databaseEnvironmentCache = new WeakMap<object, DatabaseEnvironment>();

function validateDatabaseUrl(value: string) {
  rejectPlaceholder(value, "DATABASE_URL", "Database");
  if (!databaseUrlSchema.safeParse(value).success) {
    throw environmentError("Database", "DATABASE_URL", "must be a valid PostgreSQL URL.");
  }
  const url = new URL(value);
  rejectPlaceholderUrl(url, "DATABASE_URL", "Database");
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw environmentError("Database", "DATABASE_URL", "must use the postgres or postgresql protocol.");
  }
  if (!url.hostname) throw environmentError("Database", "DATABASE_URL", "must include a hostname.");
  if (!url.pathname || url.pathname === "/") {
    throw environmentError("Database", "DATABASE_URL", "must include a database name.");
  }
  return url.toString();
}

export function getDatabaseEnvironment(
  environment: EnvironmentSource = process.env,
): DatabaseEnvironment {
  const cacheKey = environment as object;
  const cached = databaseEnvironmentCache.get(cacheKey);
  if (cached) return cached;
  const nodeEnv = parseRuntimeEnvironment(environment);
  const rawUrl = optionalValue(environment, "DATABASE_URL");
  if (!rawUrl && nodeEnv === "production") {
    throw environmentError("Database", "DATABASE_URL", "is required in production.");
  }
  const result = Object.freeze({
    nodeEnv,
    ...(rawUrl ? { databaseUrl: validateDatabaseUrl(rawUrl) } : {}),
  });
  databaseEnvironmentCache.set(cacheKey, result);
  return result;
}

export function resetDatabaseEnvironmentCacheForTests() {
  databaseEnvironmentCache = new WeakMap();
}
