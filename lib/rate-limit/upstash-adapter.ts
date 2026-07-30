import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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

export type UpstashEnvironment = {
  NODE_ENV?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  RATE_LIMIT_KEY_SECRET?: string;
  RATE_LIMIT_TRUSTED_PROXY?: string;
  RATE_LIMIT_ENV_PREFIX?: string;
};

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
  const required = [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "RATE_LIMIT_KEY_SECRET",
    "RATE_LIMIT_TRUSTED_PROXY",
  ] as const;
  for (const name of required) {
    if (!environment[name]?.trim()) throw new Error(`Rate-limit configuration is missing ${name}.`);
  }
  let redisUrl: URL;
  try {
    redisUrl = new URL(environment.UPSTASH_REDIS_REST_URL!);
  } catch {
    throw new Error("UPSTASH_REDIS_REST_URL must be an HTTP(S) URL.");
  }
  if (redisUrl.protocol !== "https:" && redisUrl.protocol !== "http:") {
    throw new Error("UPSTASH_REDIS_REST_URL must be an HTTP(S) URL.");
  }
  const proxy = environment.RATE_LIMIT_TRUSTED_PROXY!.trim().toLowerCase();
  if (!(["vercel", "direct"] as const).includes(proxy as "vercel" | "direct")) {
    throw new Error("Production RATE_LIMIT_TRUSTED_PROXY must be vercel or direct.");
  }
  const prefix = (environment.RATE_LIMIT_ENV_PREFIX?.trim().toLowerCase() || environment.NODE_ENV || "development");
  if (!/^[a-z0-9][a-z0-9_-]{0,47}$/.test(prefix)) {
    throw new Error("RATE_LIMIT_ENV_PREFIX must contain only lowercase letters, numbers, underscores, or hyphens.");
  }
  return {
    url: environment.UPSTASH_REDIS_REST_URL!,
    token: environment.UPSTASH_REDIS_REST_TOKEN!,
    secret: environment.RATE_LIMIT_KEY_SECRET!,
    environmentPrefix: prefix,
  };
}

export function createUpstashRateLimitAdapter(environment: UpstashEnvironment): RateLimitAdapter {
  const config = validateUpstashEnvironment(environment);
  const redis = new Redis({ url: config.url, token: config.token });
  return new UpstashRateLimitAdapter({
    secret: config.secret,
    limiters: createUpstashLimiters(redis, config.environmentPrefix),
  });
}
