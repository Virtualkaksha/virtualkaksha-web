import type { RateLimitPolicy } from "./types";

export type RateLimitAlgorithm = "fixed-window" | "sliding-window";
export type RateLimitFailureMode = "open" | "closed";

export type RateLimitPolicyConfig = {
  algorithm: RateLimitAlgorithm;
  limit: number;
  windowMs: number;
  failureMode: RateLimitFailureMode;
};

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const RATE_LIMIT_POLICIES = {
  "login-ip": { algorithm: "sliding-window", limit: 20, windowMs: 10 * MINUTE, failureMode: "closed" },
  "login-identity": { algorithm: "sliding-window", limit: 5, windowMs: 15 * MINUTE, failureMode: "closed" },
  "login-email": { algorithm: "sliding-window", limit: 10, windowMs: HOUR, failureMode: "closed" },
  "signup-ip": { algorithm: "sliding-window", limit: 5, windowMs: HOUR, failureMode: "closed" },
  "signup-email": { algorithm: "sliding-window", limit: 3, windowMs: DAY, failureMode: "closed" },
  "resource-create-user": { algorithm: "fixed-window", limit: 10, windowMs: 10 * MINUTE, failureMode: "closed" },
  "resource-create-ip": { algorithm: "fixed-window", limit: 30, windowMs: HOUR, failureMode: "closed" },
  "pdf-upload-user": { algorithm: "fixed-window", limit: 3, windowMs: 10 * MINUTE, failureMode: "closed" },
  "pdf-upload-ip": { algorithm: "fixed-window", limit: 10, windowMs: HOUR, failureMode: "closed" },
  "bookmark-user": { algorithm: "fixed-window", limit: 60, windowMs: MINUTE, failureMode: "open" },
  "progress-user": { algorithm: "fixed-window", limit: 120, windowMs: 10 * MINUTE, failureMode: "open" },
  "progress-resource": { algorithm: "fixed-window", limit: 30, windowMs: MINUTE, failureMode: "open" },
  "teacher-mutation-user": { algorithm: "fixed-window", limit: 15, windowMs: MINUTE, failureMode: "closed" },
  "teacher-resource-action": { algorithm: "fixed-window", limit: 3, windowMs: MINUTE, failureMode: "closed" },
  "admin-mutation-user": { algorithm: "fixed-window", limit: 10, windowMs: MINUTE, failureMode: "closed" },
  "admin-resource-action": { algorithm: "fixed-window", limit: 2, windowMs: 10 * SECOND, failureMode: "closed" },
  "admin-import-preview-user": { algorithm: "fixed-window", limit: 5, windowMs: 10 * MINUTE, failureMode: "closed" },
  "admin-import-preview-ip": { algorithm: "fixed-window", limit: 15, windowMs: HOUR, failureMode: "closed" },
  "admin-import-apply-user": { algorithm: "fixed-window", limit: 2, windowMs: 10 * MINUTE, failureMode: "closed" },
  "admin-import-apply-ip": { algorithm: "fixed-window", limit: 5, windowMs: HOUR, failureMode: "closed" },
} as const satisfies Record<RateLimitPolicy, RateLimitPolicyConfig>;

export const RATE_LIMIT_POLICY_NAMES = Object.freeze(
  Object.keys(RATE_LIMIT_POLICIES) as RateLimitPolicy[],
);

export function getRateLimitPolicy(policy: RateLimitPolicy): RateLimitPolicyConfig {
  return RATE_LIMIT_POLICIES[policy];
}
