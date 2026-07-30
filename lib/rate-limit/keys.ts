import { createHmac } from "node:crypto";

import type { RateLimitPolicy } from "./types";

export function canonicalizeRateLimitIdentifier(identifier: string) {
  const canonical = identifier.normalize("NFKC").trim().toLowerCase();
  if (!canonical) throw new Error("Rate-limit identifier is required.");
  return canonical;
}

export function createOpaqueRateLimitKey(
  policy: RateLimitPolicy,
  identifier: string,
  secret: string,
) {
  if (!secret.trim()) throw new Error("RATE_LIMIT_KEY_SECRET is required.");
  const digest = createHmac("sha256", secret)
    .update(`${policy}\u0000${canonicalizeRateLimitIdentifier(identifier)}`)
    .digest("hex");
  return `vk:rl:v1:${policy}:${digest}`;
}

