import "server-only";

import {
  getRateLimitEnvironment,
  type EnvironmentSource,
  type RateLimitEnvironment as ValidatedRateLimitEnvironment,
} from "@/lib/env";

import { MemoryRateLimitAdapter } from "./memory-adapter";
import { createUpstashRateLimitAdapter } from "./upstash-adapter";
import type { RateLimitAdapter } from "./types";

export type RateLimitAdapterName = "memory" | "upstash";
export type RateLimitEnvironment = EnvironmentSource;

type FactoryDependencies = {
  createUpstash?: (environment: ValidatedRateLimitEnvironment) => RateLimitAdapter;
};

let cachedProductionAdapter: RateLimitAdapter | null = null;

export function resolveRateLimitAdapterName(environment: EnvironmentSource): RateLimitAdapterName {
  return getRateLimitEnvironment(environment).adapter;
}

export function createRateLimitAdapter(
  environment?: EnvironmentSource,
  dependencies: FactoryDependencies = {},
): RateLimitAdapter {
  const validated = getRateLimitEnvironment(environment);
  if (validated.adapter === "upstash") {
    return (dependencies.createUpstash ?? createUpstashRateLimitAdapter)(validated);
  }
  return new MemoryRateLimitAdapter({ secret: validated.keySecret });
}

export function getRateLimitAdapter(): RateLimitAdapter {
  const validated = getRateLimitEnvironment();
  if (validated.nodeEnv !== "production") return createRateLimitAdapter();
  cachedProductionAdapter ??= createRateLimitAdapter();
  return cachedProductionAdapter;
}
