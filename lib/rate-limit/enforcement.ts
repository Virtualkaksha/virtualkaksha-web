import { getRateLimitAdapter } from "./factory";
import type { RateLimitAdapter, RateLimitDecision, RateLimitPolicy } from "./types";

export type RateLimitCheck = { policy: RateLimitPolicy; identifier: string; cost?: number };

export async function enforceRateLimitChecks(
  checks: RateLimitCheck[],
  adapter?: RateLimitAdapter,
): Promise<RateLimitDecision | null> {
  let limiter: RateLimitAdapter;
  try {
    limiter = adapter ?? getRateLimitAdapter();
  } catch {
    return { allowed: false, limit: 0, remaining: 0, retryAfterSeconds: 1, reason: "backend-unavailable" };
  }
  for (const check of checks) {
    try {
      const decision = await limiter.check(check.policy, check.identifier, check.cost);
      if (!decision.allowed) return decision;
    } catch {
      return { allowed: false, limit: 0, remaining: 0, retryAfterSeconds: 1, reason: "backend-unavailable" };
    }
  }
  return null;
}

