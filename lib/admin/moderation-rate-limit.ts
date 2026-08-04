import { enforceRateLimitChecks, type RateLimitAdapter } from "@/lib/rate-limit";

export type AdminModerationAction = "APPROVE" | "REJECT" | "ARCHIVE" | "EDIT_METADATA";

export async function limitAdminModeration(
  adminId: string,
  resourceId: string,
  action: AdminModerationAction,
  rateLimit?: RateLimitAdapter,
) {
  const decision = await enforceRateLimitChecks([
    { policy: "admin-mutation-user", identifier: adminId },
    { policy: "admin-resource-action", identifier: `${adminId}\u0000${resourceId}\u0000${action}` },
  ], rateLimit);
  return decision
    ? { allowed: false as const, retryAfterSeconds: Math.max(1, decision.retryAfterSeconds) }
    : { allowed: true as const };
}
