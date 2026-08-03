import "server-only";

import type { RoleName, UserStatus } from "@/app/generated/prisma/enums";
import { resolveCurrentIdentityForApi, type CurrentIdentityResult } from "@/lib/auth/current-identity";
import { enforceRateLimitChecks, type RateLimitAdapter } from "@/lib/rate-limit";
import {
  accountSecurityRepository,
  type AccountSecurityMutationResult,
  type AccountSecurityRepository,
} from "@/repositories/account-security.repository";

const ROLE_NAMES = new Set<RoleName>(["STUDENT", "PARENT", "TEACHER", "COACHING_OWNER", "ADMIN"]);
const STATUS_NAMES = new Set<UserStatus>(["PENDING", "ACTIVE", "SUSPENDED", "DELETED"]);

export type AccountSecurityResult =
  | { ok: true; changed: boolean; message: string }
  | { ok: false; code: "UNAUTHORIZED" | "FORBIDDEN" | "INVALID_INPUT" | "NOT_FOUND" | "LAST_ADMIN" | "RATE_LIMITED" | "UNAVAILABLE"; message: string };

type Dependencies = {
  repository?: AccountSecurityRepository;
  rateLimit?: RateLimitAdapter;
  resolveAdmin?: () => Promise<CurrentIdentityResult>;
  resolveUser?: () => Promise<CurrentIdentityResult>;
};

const success = (changed: boolean): AccountSecurityResult => ({
  ok: true,
  changed,
  message: changed ? "Account security was updated." : "No account security change was needed.",
});

function identityFailure(result: Extract<CurrentIdentityResult, { ok: false }>): AccountSecurityResult {
  if (result.code === "FORBIDDEN") return { ok: false, code: "FORBIDDEN", message: "Access is denied." };
  if (result.code === "IDENTITY_UNAVAILABLE") return { ok: false, code: "UNAVAILABLE", message: "Account security is temporarily unavailable." };
  return { ok: false, code: "UNAUTHORIZED", message: "Authentication is required." };
}

function mutationResult(result: AccountSecurityMutationResult): AccountSecurityResult {
  if (result.outcome === "changed") return success(true);
  if (result.outcome === "noop") return success(false);
  if (result.outcome === "last-admin") {
    return { ok: false, code: "LAST_ADMIN", message: "The final active administrator cannot be removed or disabled." };
  }
  return { ok: false, code: "NOT_FOUND", message: "The requested account security change could not be completed." };
}

async function authorizeAdmin(targetUserId: string, action: string, dependencies: Dependencies) {
  const identity = await (dependencies.resolveAdmin ?? (() => resolveCurrentIdentityForApi(["ADMIN"])))();
  if (!identity.ok) return identityFailure(identity);
  const limited = await enforceRateLimitChecks([
    { policy: "admin-mutation-user", identifier: identity.identity.id },
    { policy: "admin-resource-action", identifier: `${identity.identity.id}\u0000${targetUserId}\u0000${action}` },
  ], dependencies.rateLimit);
  if (limited) return { ok: false, code: "RATE_LIMITED", message: "The request could not be completed. Please try again later." } as const;
  return identity;
}

async function runAdminMutation(
  targetUserId: string,
  action: string,
  mutation: (repository: AccountSecurityRepository) => Promise<AccountSecurityMutationResult>,
  dependencies: Dependencies,
): Promise<AccountSecurityResult> {
  if (!targetUserId.trim()) return { ok: false, code: "INVALID_INPUT", message: "The requested account security change is invalid." };
  const authorization = await authorizeAdmin(targetUserId, action, dependencies);
  if (!authorization.ok) return authorization;
  try {
    return mutationResult(await mutation(dependencies.repository ?? accountSecurityRepository));
  } catch {
    return { ok: false, code: "UNAVAILABLE", message: "Account security is temporarily unavailable." };
  }
}

export function addAccountRole(targetUserId: string, role: unknown, dependencies: Dependencies = {}) {
  if (typeof role !== "string" || !ROLE_NAMES.has(role as RoleName)) {
    return Promise.resolve<AccountSecurityResult>({ ok: false, code: "INVALID_INPUT", message: "The requested role is invalid." });
  }
  return runAdminMutation(targetUserId, "ROLE_ADD", (repository) => repository.changeRole(targetUserId, role as RoleName, "add"), dependencies);
}

export function removeAccountRole(targetUserId: string, role: unknown, dependencies: Dependencies = {}) {
  if (typeof role !== "string" || !ROLE_NAMES.has(role as RoleName)) {
    return Promise.resolve<AccountSecurityResult>({ ok: false, code: "INVALID_INPUT", message: "The requested role is invalid." });
  }
  return runAdminMutation(targetUserId, "ROLE_REMOVE", (repository) => repository.changeRole(targetUserId, role as RoleName, "remove"), dependencies);
}

export function replaceAccountRoles(targetUserId: string, roles: readonly unknown[], dependencies: Dependencies = {}) {
  if (!roles.length || roles.some((role) => typeof role !== "string" || !ROLE_NAMES.has(role as RoleName)) || new Set(roles).size !== roles.length) {
    return Promise.resolve<AccountSecurityResult>({ ok: false, code: "INVALID_INPUT", message: "The requested roles are invalid." });
  }
  return runAdminMutation(targetUserId, "ROLE_REPLACE", (repository) => repository.replaceRoles(targetUserId, roles as RoleName[]), dependencies);
}

export function setAccountStatus(targetUserId: string, status: unknown, dependencies: Dependencies = {}) {
  if (typeof status !== "string" || !STATUS_NAMES.has(status as UserStatus)) {
    return Promise.resolve<AccountSecurityResult>({ ok: false, code: "INVALID_INPUT", message: "The requested account status is invalid." });
  }
  return runAdminMutation(targetUserId, "STATUS_CHANGE", (repository) => repository.changeStatus(targetUserId, status as UserStatus), dependencies);
}

export const activateAccount = (targetUserId: string, dependencies: Dependencies = {}) => setAccountStatus(targetUserId, "ACTIVE", dependencies);
export const suspendAccount = (targetUserId: string, dependencies: Dependencies = {}) => setAccountStatus(targetUserId, "SUSPENDED", dependencies);
export const deactivateAccount = suspendAccount;
export const markAccountDeleted = (targetUserId: string, dependencies: Dependencies = {}) => setAccountStatus(targetUserId, "DELETED", dependencies);

export function resetAccountPasswordHash(targetUserId: string, passwordHash: string, dependencies: Dependencies = {}) {
  if (!passwordHash.trim()) return Promise.resolve<AccountSecurityResult>({ ok: false, code: "INVALID_INPUT", message: "The password security update is invalid." });
  return runAdminMutation(targetUserId, "PASSWORD_RESET", (repository) => repository.changePasswordHash(targetUserId, passwordHash), dependencies);
}

export async function changeOwnPasswordHash(passwordHash: string, dependencies: Dependencies = {}): Promise<AccountSecurityResult> {
  if (!passwordHash.trim()) return { ok: false, code: "INVALID_INPUT", message: "The password security update is invalid." };
  const identity = await (dependencies.resolveUser ?? (() => resolveCurrentIdentityForApi()))();
  if (!identity.ok) return identityFailure(identity);
  try {
    return mutationResult(await (dependencies.repository ?? accountSecurityRepository).changePasswordHash(identity.identity.id, passwordHash));
  } catch {
    return { ok: false, code: "UNAVAILABLE", message: "Account security is temporarily unavailable." };
  }
}

export async function logOutAllSessions(dependencies: Dependencies = {}): Promise<AccountSecurityResult> {
  const identity = await (dependencies.resolveUser ?? (() => resolveCurrentIdentityForApi()))();
  if (!identity.ok) return identityFailure(identity);
  try {
    return mutationResult(await (dependencies.repository ?? accountSecurityRepository).incrementSessionVersion(identity.identity.id, true));
  } catch {
    return { ok: false, code: "UNAVAILABLE", message: "Account security is temporarily unavailable." };
  }
}
