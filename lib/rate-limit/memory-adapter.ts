import { createOpaqueRateLimitKey } from "./keys";
import { getRateLimitPolicy } from "./policies";
import type { RateLimitAdapter, RateLimitDecision, RateLimitPolicy } from "./types";

type Counter = { used: number; expiresAt: number };
type MemoryAdapterOptions = { secret: string; clock?: () => number };

export class MemoryRateLimitAdapter implements RateLimitAdapter {
  readonly #clock: () => number;
  readonly #secret: string;
  readonly #counters = new Map<string, Counter>();

  constructor({ secret, clock = Date.now }: MemoryAdapterOptions) {
    if (!secret.trim()) throw new Error("A rate-limit key secret is required.");
    this.#secret = secret;
    this.#clock = clock;
  }

  async check(policy: RateLimitPolicy, identifier: string, cost = 1): Promise<RateLimitDecision> {
    if (!Number.isSafeInteger(cost) || cost < 1) throw new Error("Rate-limit cost must be a positive integer.");
    const config = getRateLimitPolicy(policy);
    const key = createOpaqueRateLimitKey(policy, identifier, this.#secret);
    const now = this.#clock();
    let counter = this.#counters.get(key);
    if (!counter || now >= counter.expiresAt) {
      counter = { used: 0, expiresAt: now + config.windowMs };
      this.#counters.set(key, counter);
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((counter.expiresAt - now) / 1_000));
    if (counter.used + cost > config.limit) {
      return { allowed: false, limit: config.limit, remaining: Math.max(0, config.limit - counter.used), retryAfterSeconds, reason: "limited" };
    }
    counter.used += cost;
    return {
      allowed: true,
      limit: config.limit,
      remaining: Math.max(0, config.limit - counter.used),
      retryAfterSeconds: counter.used >= config.limit ? retryAfterSeconds : 0,
    };
  }

  async reset(policy: RateLimitPolicy, identifier: string): Promise<void> {
    this.#counters.delete(createOpaqueRateLimitKey(policy, identifier, this.#secret));
  }

  /** Test-only helper; never expose counter contents to application logs. */
  resetAllForTests(): void {
    this.#counters.clear();
  }
}

