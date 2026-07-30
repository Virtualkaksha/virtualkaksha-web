import { isIP } from "node:net";

export type TrustedProxyMode = "vercel" | "direct" | "test";
export type ClientIpFailureCode = "INVALID_CONFIGURATION" | "MISSING_IP" | "MALFORMED_IP";
export type ClientIpResult =
  | { ok: true; address: string }
  | { ok: false; code: ClientIpFailureCode; message: string };

type ClientIpInput = {
  request?: Request;
  directAddress?: string | null;
  testAddress?: string | null;
  environment?: { NODE_ENV?: string; RATE_LIMIT_TRUSTED_PROXY?: string };
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
  environment: ClientIpInput["environment"] = process.env,
): TrustedProxyMode | null {
  const configured = environment?.RATE_LIMIT_TRUSTED_PROXY?.trim().toLowerCase();
  if (configured === "vercel" || configured === "direct" || configured === "test") return configured;
  return null;
}

export function resolveTrustedClientIp(input: ClientIpInput): ClientIpResult {
  const environment = input.environment ?? process.env;
  const mode = readTrustedProxyMode(environment);
  if (!mode) {
    return invalid(
      "INVALID_CONFIGURATION",
      environment.NODE_ENV === "production"
        ? "RATE_LIMIT_TRUSTED_PROXY must be configured in production."
        : "RATE_LIMIT_TRUSTED_PROXY must select vercel, direct, or test.",
    );
  }

  if (mode === "vercel") {
    const firstAddress = input.request?.headers.get("x-forwarded-for")?.split(",", 1)[0];
    return validateAddress(firstAddress);
  }
  if (mode === "direct") return validateAddress(input.directAddress);
  if (environment.NODE_ENV === "production") {
    return invalid("INVALID_CONFIGURATION", "The test proxy mode is unavailable in production.");
  }
  return validateAddress(input.testAddress);
}

