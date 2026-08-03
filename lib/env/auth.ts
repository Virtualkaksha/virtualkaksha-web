import "server-only";

import { z } from "zod";

import {
  environmentError,
  optionalValue,
  parseHttpUrl,
  parseRuntimeEnvironment,
  parseStrictBoolean,
  rejectPlaceholder,
  rejectPlaceholderUrl,
  type EnvironmentSource,
  type RuntimeEnvironment,
} from "./common";

export type AuthEnvironment = Readonly<{
  nodeEnv: RuntimeEnvironment;
  authSecret?: string;
  authUrl?: string;
  authTrustHost?: boolean;
}>;

const secretSchema = z.string().min(32);
let authEnvironmentCache = new WeakMap<object, AuthEnvironment>();

export function getAuthEnvironment(environment: EnvironmentSource = process.env): AuthEnvironment {
  const cacheKey = environment as object;
  const cached = authEnvironmentCache.get(cacheKey);
  if (cached) return cached;
  const nodeEnv = parseRuntimeEnvironment(environment);
  const production = nodeEnv === "production";
  const secret = optionalValue(environment, "AUTH_SECRET");
  const rawUrl = optionalValue(environment, "AUTH_URL");
  const rawTrustHost = optionalValue(environment, "AUTH_TRUST_HOST");

  if (!secret && production) throw environmentError("Auth", "AUTH_SECRET", "is required in production.");
  if (secret) {
    rejectPlaceholder(secret, "AUTH_SECRET", "Auth");
    if (!secretSchema.safeParse(secret).success) {
      throw environmentError("Auth", "AUTH_SECRET", "must contain at least 32 characters.");
    }
  }
  if (!rawUrl && production) throw environmentError("Auth", "AUTH_URL", "is required in production.");
  const authUrl = rawUrl
    ? parseHttpUrl(rawUrl, "AUTH_URL", "Auth", { requireHttps: production, allowLocalHttp: !production })
    : undefined;
  if (authUrl) rejectPlaceholderUrl(authUrl, "AUTH_URL", "Auth");
  if (!rawTrustHost && production) {
    throw environmentError("Auth", "AUTH_TRUST_HOST", "is required in production.");
  }
  const authTrustHost = rawTrustHost
    ? parseStrictBoolean(rawTrustHost, "AUTH_TRUST_HOST", "Auth")
    : undefined;
  if (authTrustHost === false && !authUrl) {
    throw environmentError("Auth", "AUTH_URL", "is required when AUTH_TRUST_HOST is false.");
  }

  const result = Object.freeze({
    nodeEnv,
    ...(secret ? { authSecret: secret } : {}),
    ...(authUrl ? { authUrl: authUrl.toString() } : {}),
    ...(authTrustHost === undefined ? {} : { authTrustHost }),
  });
  authEnvironmentCache.set(cacheKey, result);
  return result;
}

export function resetAuthEnvironmentCacheForTests() {
  authEnvironmentCache = new WeakMap();
}
