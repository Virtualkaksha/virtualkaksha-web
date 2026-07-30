import { MemoryRateLimitAdapter } from "./memory-adapter";
import { createUpstashRateLimitAdapter, type UpstashEnvironment } from "./upstash-adapter";
import type { RateLimitAdapter } from "./types";

export type RateLimitAdapterName = "memory" | "upstash";
export type RateLimitEnvironment = UpstashEnvironment & { RATE_LIMIT_ADAPTER?: string };

type FactoryDependencies = {
  createUpstash?: (environment: RateLimitEnvironment) => RateLimitAdapter;
};

let cachedProductionAdapter: RateLimitAdapter | null = null;

export function resolveRateLimitAdapterName(environment: RateLimitEnvironment): RateLimitAdapterName {
  const requested = environment.RATE_LIMIT_ADAPTER?.trim().toLowerCase();
  if (requested && requested !== "memory" && requested !== "upstash") {
    throw new Error(`Unsupported rate-limit adapter: ${requested}.`);
  }
  if (environment.NODE_ENV === "production") {
    if (requested === "memory") throw new Error("The in-memory rate-limit adapter cannot be used in production.");
    return "upstash";
  }
  return requested === "upstash" ? "upstash" : "memory";
}

export function createRateLimitAdapter(
  environment: RateLimitEnvironment = process.env,
  dependencies: FactoryDependencies = {},
): RateLimitAdapter {
  const adapterName = resolveRateLimitAdapterName(environment);
  if (adapterName === "upstash") {
    return (dependencies.createUpstash ?? createUpstashRateLimitAdapter)(environment);
  }
  const secret = environment.RATE_LIMIT_KEY_SECRET?.trim();
  if (!secret) throw new Error("RATE_LIMIT_KEY_SECRET is required.");
  return new MemoryRateLimitAdapter({ secret });
}

export function getRateLimitAdapter(): RateLimitAdapter {
  if (process.env.NODE_ENV !== "production") return createRateLimitAdapter(process.env);
  cachedProductionAdapter ??= createRateLimitAdapter(process.env);
  return cachedProductionAdapter;
}
