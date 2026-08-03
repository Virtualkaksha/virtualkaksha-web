import "server-only";

import { z } from "zod";

import {
  environmentError,
  optionalValue,
  parseHttpUrl,
  parseRuntimeEnvironment,
  rejectPlaceholder,
  rejectPlaceholderUrl,
  requiredValue,
  type EnvironmentSource,
  type RuntimeEnvironment,
} from "./common";

export type RateLimitEnvironment = Readonly<{
  nodeEnv: RuntimeEnvironment;
  adapter: "memory" | "upstash";
  keySecret: string;
  trustedProxy: "vercel" | "direct" | "test";
  environmentPrefix: string;
  upstashUrl?: string;
  upstashToken?: string;
}>;

const adapterSchema = z.enum(["memory", "upstash"]);
const proxySchema = z.enum(["vercel", "direct", "test"]);
const secretSchema = z.string().min(32);
const prefixSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,47}$/);
let rateLimitEnvironmentCache = new WeakMap<object, RateLimitEnvironment>();

export function getRateLimitEnvironment(
  environment: EnvironmentSource = process.env,
): RateLimitEnvironment {
  const cacheKey = environment as object;
  const cached = rateLimitEnvironmentCache.get(cacheKey);
  if (cached) return cached;
  const nodeEnv = parseRuntimeEnvironment(environment);
  const rawAdapter = optionalValue(environment, "RATE_LIMIT_ADAPTER")?.toLowerCase()
    ?? (nodeEnv === "production" ? undefined : "memory");
  if (!rawAdapter) throw environmentError("Rate limit", "RATE_LIMIT_ADAPTER", "is required in production.");
  const adapterResult = adapterSchema.safeParse(rawAdapter);
  if (!adapterResult.success) {
    throw environmentError("Rate limit", "RATE_LIMIT_ADAPTER", "must be memory or upstash.");
  }
  const adapter = adapterResult.data;
  if (nodeEnv === "production" && adapter !== "upstash") {
    throw environmentError("Rate limit", "RATE_LIMIT_ADAPTER", "must be upstash in production.");
  }

  const keySecret = requiredValue(environment, "RATE_LIMIT_KEY_SECRET", "Rate limit");
  rejectPlaceholder(keySecret, "RATE_LIMIT_KEY_SECRET", "Rate limit");
  if (!secretSchema.safeParse(keySecret).success) {
    throw environmentError("Rate limit", "RATE_LIMIT_KEY_SECRET", "must contain at least 32 characters.");
  }
  const rawProxy = requiredValue(environment, "RATE_LIMIT_TRUSTED_PROXY", "Rate limit").toLowerCase();
  const proxyResult = proxySchema.safeParse(rawProxy);
  if (!proxyResult.success) {
    throw environmentError("Rate limit", "RATE_LIMIT_TRUSTED_PROXY", "must be vercel, direct, or test.");
  }
  const trustedProxy = proxyResult.data;
  if (trustedProxy === "test" && nodeEnv !== "test") {
    throw environmentError("Rate limit", "RATE_LIMIT_TRUSTED_PROXY", "may be test only when NODE_ENV is test.");
  }
  const environmentPrefix = optionalValue(environment, "RATE_LIMIT_ENV_PREFIX")?.toLowerCase() ?? nodeEnv;
  if (!prefixSchema.safeParse(environmentPrefix).success) {
    throw environmentError("Rate limit", "RATE_LIMIT_ENV_PREFIX", "has an invalid format.");
  }

  let upstashUrl: URL | undefined;
  let upstashToken: string | undefined;
  if (adapter === "upstash") {
    upstashUrl = parseHttpUrl(
      requiredValue(environment, "UPSTASH_REDIS_REST_URL", "Rate limit"),
      "UPSTASH_REDIS_REST_URL",
      "Rate limit",
      { requireHttps: nodeEnv === "production" },
    );
    rejectPlaceholderUrl(upstashUrl, "UPSTASH_REDIS_REST_URL", "Rate limit");
    upstashToken = requiredValue(environment, "UPSTASH_REDIS_REST_TOKEN", "Rate limit");
    rejectPlaceholder(upstashToken, "UPSTASH_REDIS_REST_TOKEN", "Rate limit");
  }

  const result = Object.freeze({
    nodeEnv,
    adapter,
    keySecret,
    trustedProxy,
    environmentPrefix,
    ...(upstashUrl ? { upstashUrl: upstashUrl.toString() } : {}),
    ...(upstashToken ? { upstashToken } : {}),
  });
  rateLimitEnvironmentCache.set(cacheKey, result);
  return result;
}

export function resetRateLimitEnvironmentCacheForTests() {
  rateLimitEnvironmentCache = new WeakMap();
}
