import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import {
  getRateLimitEnvironment,
  type EnvironmentSource,
  type RateLimitEnvironment as ValidatedRateLimitEnvironment,
} from "@/lib/env";
import { createOpaqueRateLimitKey } from "./keys";
import { getRateLimitPolicy, RATE_LIMIT_POLICY_NAMES, type RateLimitAlgorithm } from "./policies";
import type { RateLimitAdapter, RateLimitDecision, RateLimitPolicy } from "./types";

export const UPSTASH_BACKEND_TIMEOUT_MS = 900;

export type UpstashLimiter = {
  limit(identifier: string, options?: { rate?: number }): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
    reason?: string;
  }>;
  resetUsedTokens(identifier: string): Promise<void>;
};

type UpstashAdapterOptions = {
  secret: string;
  limiters: Readonly<Record<RateLimitPolicy, UpstashLimiter>>;
  timeoutMs?: number;
  clock?: () => number;
};

export type UpstashEnvironment = EnvironmentSource;

function duration(windowMs: number): Duration {
  return `${windowMs} ms`;
}

export function getUpstashAlgorithm(policy: RateLimitPolicy): RateLimitAlgorithm {
  return getRateLimitPolicy(policy).algorithm;
}

function buildLimiter(policy: RateLimitPolicy, redis: Redis, environmentPrefix: string): Ratelimit {
  const config = getRateLimitPolicy(policy);
  const limiter = config.algorithm === "sliding-window"
    ? Ratelimit.slidingWindow(config.limit, duration(config.windowMs))
    : Ratelimit.fixedWindow(config.limit, duration(config.windowMs));
  return new Ratelimit({
    redis,
    limiter,
    prefix: createUpstashPrefix(policy, environmentPrefix),
    analytics: false,
    timeout: UPSTASH_BACKEND_TIMEOUT_MS,
  });
}

export function createUpstashPrefix(policy: RateLimitPolicy, environmentPrefix: string) {
  return `vk:rl:${environmentPrefix}:${policy}`;
}

export function createUpstashLimiters(redis: Redis, environmentPrefix: string) {
  return Object.fromEntries(
    RATE_LIMIT_POLICY_NAMES.map((policy) => [policy, buildLimiter(policy, redis, environmentPrefix)]),
  ) as unknown as Record<RateLimitPolicy, UpstashLimiter>;
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("RATE_LIMIT_BACKEND_TIMEOUT")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function unavailable(policy: RateLimitPolicy): RateLimitDecision {
  const config = getRateLimitPolicy(policy);
  return {
    allowed: false,
    limit: config.limit,
    remaining: 0,
    retryAfterSeconds: 1,
    reason: "backend-unavailable",
  };
}

export class UpstashRateLimitAdapter implements RateLimitAdapter {
  readonly #clock: () => number;
  readonly #limiters: Readonly<Record<RateLimitPolicy, UpstashLimiter>>;
  readonly #secret: string;
  readonly #timeoutMs: number;

  constructor({ secret, limiters, timeoutMs = UPSTASH_BACKEND_TIMEOUT_MS, clock = Date.now }: UpstashAdapterOptions) {
    if (!secret.trim()) throw new Error("RATE_LIMIT_KEY_SECRET is required.");
    this.#secret = secret;
    this.#limiters = limiters;
    this.#timeoutMs = timeoutMs;
    this.#clock = clock;
  }

  async check(policy: RateLimitPolicy, identifier: string, cost = 1): Promise<RateLimitDecision> {
    if (!Number.isSafeInteger(cost) || cost < 1) throw new Error("Rate-limit cost must be a positive integer.");
    const opaqueIdentifier = createOpaqueRateLimitKey(policy, identifier, this.#secret);
    try {
      const result = await withTimeout(this.#limiters[policy].limit(opaqueIdentifier, { rate: cost }), this.#timeoutMs);
      if (result.reason === "timeout") return unavailable(policy);
      return {
        allowed: result.success,
        limit: result.limit,
        remaining: Math.max(0, result.remaining),
        retryAfterSeconds: result.success ? 0 : Math.max(1, Math.ceil((result.reset - this.#clock()) / 1_000)),
        ...(result.success ? {} : { reason: "limited" as const }),
      };
    } catch {
      return unavailable(policy);
    }
  }

  async reset(policy: RateLimitPolicy, identifier: string): Promise<void> {
    const opaqueIdentifier = createOpaqueRateLimitKey(policy, identifier, this.#secret);
    try {
      await withTimeout(this.#limiters[policy].resetUsedTokens(opaqueIdentifier), this.#timeoutMs);
    } catch {
      throw new Error("Rate-limit backend is unavailable.");
    }
  }
}

export function validateUpstashEnvironment(environment: UpstashEnvironment) {
  const validated = getRateLimitEnvironment({ ...environment, RATE_LIMIT_ADAPTER: "upstash" });
  if (!validated.upstashUrl || !validated.upstashToken) {
    throw new Error("Rate limit environment validation failed: Upstash configuration is required.");
  }
  return {
    url: validated.upstashUrl,
    token: validated.upstashToken,
    secret: validated.keySecret,
    environmentPrefix: validated.environmentPrefix,
  };
}

export function createUpstashRateLimitAdapter(environment: ValidatedRateLimitEnvironment): RateLimitAdapter {
  if (environment.adapter !== "upstash" || !environment.upstashUrl || !environment.upstashToken) {
    throw new Error("Rate limit environment validation failed: Upstash configuration is required.");
  }
  const redis = new Redis({ url: environment.upstashUrl, token: environment.upstashToken });
  return new UpstashRateLimitAdapter({
    secret: environment.keySecret,
    limiters: createUpstashLimiters(redis, environment.environmentPrefix),
  });
}
