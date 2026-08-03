import "server-only";

import { z } from "zod";

export type EnvironmentSource = Readonly<Record<string, string | undefined>>;
export type RuntimeEnvironment = "development" | "test" | "production";

export type CommonEnvironment = Readonly<{
  nodeEnv: RuntimeEnvironment;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}>;

const nodeEnvironmentSchema = z.enum(["development", "test", "production"], {
  error: "NODE_ENV must be development, test, or production.",
});

const PLACEHOLDER_PATTERN = /^(?:change[-_ ]?me|replace[-_ ]?me(?:[-_ ].*)?|example(?:[-_ ].*)?|your[-_ ]?secret(?:[-_ ].*)?|placeholder(?:[-_ ].*)?)$/i;

let commonEnvironmentCache = new WeakMap<object, CommonEnvironment>();

export function environmentError(subsystem: string, variable: string, reason: string): Error {
  return new Error(`${subsystem} environment validation failed: ${variable} ${reason}`);
}

export function requiredValue(
  environment: EnvironmentSource,
  variable: string,
  subsystem: string,
): string {
  const value = environment[variable]?.trim();
  if (!value) throw environmentError(subsystem, variable, "is required.");
  return value;
}

export function optionalValue(environment: EnvironmentSource, variable: string): string | undefined {
  const value = environment[variable]?.trim();
  return value || undefined;
}

export function rejectPlaceholder(value: string, variable: string, subsystem: string) {
  if (PLACEHOLDER_PATTERN.test(value.trim())) {
    throw environmentError(subsystem, variable, "must not use a placeholder value.");
  }
}

export function rejectPlaceholderUrl(url: URL, variable: string, subsystem: string) {
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const candidates = [url.hostname, url.username, url.password, databaseName];
  if (
    url.hostname.endsWith(".example")
    || url.hostname.startsWith("replace-")
    || candidates.some((value) => value && PLACEHOLDER_PATTERN.test(value))
  ) {
    throw environmentError(subsystem, variable, "must not use a placeholder value.");
  }
}

export function parseRuntimeEnvironment(environment: EnvironmentSource): RuntimeEnvironment {
  const result = nodeEnvironmentSchema.safeParse(environment.NODE_ENV);
  if (!result.success) throw environmentError("Common", "NODE_ENV", "must be development, test, or production.");
  return result.data;
}

export function parseStrictBoolean(value: string, variable: string, subsystem: string): boolean {
  const result = z.enum(["true", "false"]).safeParse(value);
  if (!result.success) throw environmentError(subsystem, variable, "must be exactly true or false.");
  return result.data === "true";
}

export function parseHttpUrl(
  value: string,
  variable: string,
  subsystem: string,
  options: { requireHttps: boolean; allowLocalHttp?: boolean },
): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw environmentError(subsystem, variable, "must be a valid absolute HTTP(S) URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw environmentError(subsystem, variable, "must be a valid absolute HTTP(S) URL.");
  }
  if (url.protocol === "http:" && options.requireHttps) {
    throw environmentError(subsystem, variable, "must use HTTPS in production.");
  }
  if (url.protocol === "http:" && options.allowLocalHttp) {
    const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
    if (!localHosts.has(url.hostname)) {
      throw environmentError(subsystem, variable, "may use HTTP only with localhost in development or test.");
    }
  }
  return url;
}

export function getCommonEnvironment(
  environment: EnvironmentSource = process.env,
): CommonEnvironment {
  const cacheKey = environment as object;
  const cached = commonEnvironmentCache.get(cacheKey);
  if (cached) return cached;
  const nodeEnv = parseRuntimeEnvironment(environment);
  const result = Object.freeze({
    nodeEnv,
    isProduction: nodeEnv === "production",
    isDevelopment: nodeEnv === "development",
    isTest: nodeEnv === "test",
  });
  commonEnvironmentCache.set(cacheKey, result);
  return result;
}

export function isProduction(environment?: EnvironmentSource) {
  return getCommonEnvironment(environment).isProduction;
}

export function isDevelopment(environment?: EnvironmentSource) {
  return getCommonEnvironment(environment).isDevelopment;
}

export function isTest(environment?: EnvironmentSource) {
  return getCommonEnvironment(environment).isTest;
}

export function resetCommonEnvironmentCacheForTests() {
  commonEnvironmentCache = new WeakMap();
}
