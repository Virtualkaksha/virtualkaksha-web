import { enforceRateLimitChecks, type RateLimitAdapter } from "@/lib/rate-limit";

export type TeacherMutationAction = "SUBMIT" | "RESUBMIT" | "UNPUBLISH" | "ARCHIVE" | "EDIT";

type Dependencies = {
  rateLimit?: RateLimitAdapter;
  findOwned?: (resourceId: string, userId: string) => Promise<unknown | null>;
};

export async function authorizeTeacherMutation(
  user: { id: string },
  resourceId: string,
  action: TeacherMutationAction,
  dependencies: Dependencies = {},
) {
  const findOwned = dependencies.findOwned ?? (async (id: string, userId: string) => {
    const repository = await import("@/repositories/teacher-resource.repository");
    return repository.findTeacherManagedResource(id, userId, false);
  });
  if (!await findOwned(resourceId, user.id)) return { ok: false as const, code: "NOT_FOUND" as const };
  const decision = await enforceRateLimitChecks([
    { policy: "teacher-mutation-user", identifier: user.id },
    { policy: "teacher-resource-action", identifier: `${user.id}\u0000${resourceId}\u0000${action}` },
  ], dependencies.rateLimit);
  return decision
    ? { ok: false as const, code: "RATE_LIMITED" as const, retryAfterSeconds: Math.max(1, decision.retryAfterSeconds) }
    : { ok: true as const };
}

