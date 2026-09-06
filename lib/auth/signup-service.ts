import { hashPassword } from "@/lib/auth/password";
import type { RateLimitAdapter, RateLimitDecision } from "@/lib/rate-limit";
import { getRateLimitAdapter, resolveRequestClientIp } from "@/lib/rate-limit";

export type SignupServiceResult = { accepted: true } | { accepted: false; retryAfterSeconds: number };

type SignupInput = { firstName: string; lastName?: string; email: string; password: string; request: Request };
type SignupDependencies = {
  rateLimit?: RateLimitAdapter;
  resolveIp?: (request: Request) => ReturnType<typeof resolveRequestClientIp>;
  hash?: (password: string) => Promise<string>;
  createUser?: (input: { firstName: string; lastName?: string; email: string; passwordHash: string }) => Promise<unknown>;
  isUniqueConflict?: (error: unknown) => boolean;
};

function unavailable(): RateLimitDecision {
  return { allowed: false, limit: 0, remaining: 0, retryAfterSeconds: 1, reason: "backend-unavailable" };
}

function defaultIsUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export async function registerStudentAccount(
  input: SignupInput,
  dependencies: SignupDependencies = {},
): Promise<SignupServiceResult> {
  const ipResult = (dependencies.resolveIp ?? ((request) => resolveRequestClientIp(request)))(input.request);
  if (!ipResult.ok) return { accepted: false, retryAfterSeconds: 1 };

  let limiter: RateLimitAdapter;
  try {
    limiter = dependencies.rateLimit ?? getRateLimitAdapter();
  } catch {
    return { accepted: false, retryAfterSeconds: 1 };
  }
  for (const [policy, identifier] of [
    ["signup-ip", ipResult.address],
    ["signup-email", input.email],
  ] as const) {
    const decision = await limiter.check(policy, identifier).catch(() => unavailable());
    if (!decision.allowed) return { accepted: false, retryAfterSeconds: Math.max(1, decision.retryAfterSeconds) };
  }

  const passwordHash = await (dependencies.hash ?? hashPassword)(input.password);
  try {
    const createUser = dependencies.createUser ?? (async (value: { firstName: string; lastName?: string; email: string; passwordHash: string }) => {
      const repository = await import("@/repositories/auth.repository");
      return repository.createStudentUser(value);
    });
    await createUser({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      passwordHash,
    });
  } catch (error) {
    if (!(dependencies.isUniqueConflict ?? defaultIsUniqueConflict)(error)) throw error;
  }
  return { accepted: true };
}
