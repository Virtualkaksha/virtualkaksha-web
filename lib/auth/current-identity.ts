import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import type { RoleName } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { getRoleHome } from "@/lib/auth/role-routing";
import {
  findCurrentIdentityById,
  type CurrentIdentityRecord,
} from "@/repositories/current-identity.repository";

export type CurrentIdentity = Readonly<{
  id: string;
  roles: RoleName[];
  sessionVersion: number;
}>;

export type CurrentIdentityFailureCode =
  | "NO_SESSION"
  | "STALE_SESSION"
  | "INACTIVE_ACCOUNT"
  | "IDENTITY_UNAVAILABLE"
  | "FORBIDDEN";

export type CurrentIdentityResult =
  | { ok: true; identity: CurrentIdentity }
  | { ok: false; code: CurrentIdentityFailureCode; message: string };

export const CURRENT_IDENTITY_PRIVATE_HEADERS = Object.freeze({
  "Cache-Control": "private, no-store",
} as const);

export function currentIdentityFailureStatus(code: CurrentIdentityFailureCode) {
  if (code === "FORBIDDEN") return 403;
  if (code === "IDENTITY_UNAVAILABLE") return 503;
  return 401;
}

type SessionClaims = {
  user?: {
    id?: unknown;
    sessionVersion?: unknown;
    // Roles embedded in a JWT are redirect/UI hints only. Authorization uses database roles below.
    roles?: unknown;
  };
} | null;

type CurrentIdentityDependencies = {
  getSession: () => Promise<SessionClaims>;
  findIdentity: (userId: string) => Promise<CurrentIdentityRecord | null>;
};

const AUTHENTICATION_REQUIRED = "Authentication is required.";
const SESSION_INVALID = "The session is no longer valid.";
const ACCOUNT_UNAVAILABLE = "The account is not available.";
const IDENTITY_UNAVAILABLE = "Authentication is temporarily unavailable.";
const ACCESS_DENIED = "Access is denied.";

export class CurrentIdentityUnavailableError extends Error {
  constructor() {
    super(IDENTITY_UNAVAILABLE);
    this.name = "CurrentIdentityUnavailableError";
  }
}

function failure(code: CurrentIdentityFailureCode, message: string): CurrentIdentityResult {
  return { ok: false, code, message };
}

export async function resolveCurrentIdentityClaims(
  dependencies: CurrentIdentityDependencies,
): Promise<CurrentIdentityResult> {
  const session = await dependencies.getSession();
  const userId = session?.user?.id;
  if (typeof userId !== "string" || !userId.trim()) {
    return failure("NO_SESSION", AUTHENTICATION_REQUIRED);
  }

  const tokenVersion = session?.user?.sessionVersion;
  if (!Number.isSafeInteger(tokenVersion) || Number(tokenVersion) < 1) {
    return failure("STALE_SESSION", SESSION_INVALID);
  }

  let record: CurrentIdentityRecord | null;
  try {
    record = await dependencies.findIdentity(userId);
  } catch {
    return failure("IDENTITY_UNAVAILABLE", IDENTITY_UNAVAILABLE);
  }

  if (!record) return failure("STALE_SESSION", SESSION_INVALID);
  if (record.status !== "ACTIVE") {
    return failure("INACTIVE_ACCOUNT", ACCOUNT_UNAVAILABLE);
  }
  if (record.sessionVersion !== tokenVersion) {
    return failure("STALE_SESSION", SESSION_INVALID);
  }

  return {
    ok: true,
    identity: Object.freeze({
      id: record.id,
      roles: record.roles.map(({ role }) => role.name),
      sessionVersion: record.sessionVersion,
    }),
  };
}

export function createCurrentIdentityRequestContext(dependencies: CurrentIdentityDependencies) {
  let result: Promise<CurrentIdentityResult> | undefined;
  return Object.freeze({
    resolve() {
      result ??= resolveCurrentIdentityClaims(dependencies);
      return result;
    },
  });
}

const resolveCurrentIdentityForRequest = cache(() =>
  resolveCurrentIdentityClaims({
    getSession: auth as () => Promise<SessionClaims>,
    findIdentity: findCurrentIdentityById,
  }),
);

export function resolveCurrentIdentityForApi(
  requiredRoles: readonly RoleName[] = [],
  requestContext?: ReturnType<typeof createCurrentIdentityRequestContext>,
) {
  const resolution = requestContext
    ? requestContext.resolve()
    : resolveCurrentIdentityForRequest();
  return resolution.then((result): CurrentIdentityResult => {
    if (!result.ok || requiredRoles.length === 0) return result;
    return requiredRoles.some((role) => result.identity.roles.includes(role))
      ? result
      : failure("FORBIDDEN", ACCESS_DENIED);
  });
}

export async function getCurrentIdentity(): Promise<CurrentIdentity | null> {
  const result = await resolveCurrentIdentityForRequest();
  return result.ok ? result.identity : null;
}

export async function requireCurrentUser(): Promise<CurrentIdentity> {
  const result = await resolveCurrentIdentityForRequest();
  if (result.ok) return result.identity;
  if (result.code === "IDENTITY_UNAVAILABLE") throw new CurrentIdentityUnavailableError();
  redirect("/login");
}

export async function requireAnyCurrentRole(roles: readonly RoleName[]): Promise<CurrentIdentity> {
  const identity = await requireCurrentUser();
  if (!roles.some((role) => identity.roles.includes(role))) redirect(getRoleHome(identity.roles));
  return identity;
}

export function requireCurrentRole(role: RoleName) {
  return requireAnyCurrentRole([role]);
}
