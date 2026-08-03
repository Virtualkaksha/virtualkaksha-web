import { isIP } from "node:net";

import { getRateLimitEnvironment, type EnvironmentSource } from "@/lib/env";

export type TrustedProxyMode = "vercel" | "direct" | "test";
export type ClientIpFailureCode = "INVALID_CONFIGURATION" | "MISSING_IP" | "MALFORMED_IP";
export type ClientIpResult =
  | { ok: true; address: string }
  | { ok: false; code: ClientIpFailureCode; message: string };

type ClientIpInput = {
  request?: Request;
  directAddress?: string | null;
  testAddress?: string | null;
  environment?: EnvironmentSource;
};

function invalid(code: ClientIpFailureCode, message: string): ClientIpResult {
  return { ok: false, code, message };
}

function validateAddress(value: string | null | undefined): ClientIpResult {
  if (!value?.trim()) return invalid("MISSING_IP", "A trusted client address is unavailable.");
  const address = value.trim();
  return isIP(address)
    ? { ok: true, address }
    : invalid("MALFORMED_IP", "The trusted client address is malformed.");
}

export function readTrustedProxyMode(
  environment?: ClientIpInput["environment"],
): TrustedProxyMode | null {
  try {
    return getRateLimitEnvironment(environment).trustedProxy;
  } catch {
    return null;
  }
}

export function resolveTrustedClientIp(input: ClientIpInput): ClientIpResult {
  const environment = input.environment;
  const mode = readTrustedProxyMode(environment);
  if (!mode) {
    return invalid(
      "INVALID_CONFIGURATION",
      "RATE_LIMIT_TRUSTED_PROXY must select a valid mode for the current environment.",
    );
  }

  if (mode === "vercel") {
    const firstAddress = input.request?.headers.get("x-forwarded-for")?.split(",", 1)[0];
    return validateAddress(firstAddress);
  }
  if (mode === "direct") return validateAddress(input.directAddress);
  return validateAddress(input.testAddress);
}
