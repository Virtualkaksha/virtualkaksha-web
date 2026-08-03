import { NextResponse } from "next/server";
import type { RoleName } from "@/app/generated/prisma/enums";

import { getRateLimitAdapter, rateLimitResponse, type RateLimitAdapter } from "@/lib/rate-limit";
import { getStudentResourceProgress, saveStudentResourceProgress, type StudentUser } from "@/lib/resources/student-resource-service";
import {
  CURRENT_IDENTITY_PRIVATE_HEADERS,
  currentIdentityFailureStatus,
  resolveCurrentIdentityForApi,
  type CurrentIdentityResult,
} from "@/lib/auth/current-identity";

type ProgressDependencies = {
  resolveIdentity?: () => Promise<CurrentIdentityResult>;
  /** Test seam for an already-validated current identity. */
  getCurrentUser?: () => Promise<StudentUser | null>;
  getProgress?: typeof getStudentResourceProgress;
  saveProgress?: typeof saveStudentResourceProgress;
  rateLimit?: RateLimitAdapter;
};

async function resolveStudentIdentity(dependencies: ProgressDependencies): Promise<CurrentIdentityResult> {
  if (dependencies.resolveIdentity) return dependencies.resolveIdentity();
  if (dependencies.getCurrentUser) {
    try {
      const user = await dependencies.getCurrentUser();
      if (!user) return { ok: false, code: "NO_SESSION", message: "Authentication is required." };
      if (!user.roles.includes("STUDENT")) return { ok: false, code: "FORBIDDEN", message: "Access is denied." };
      return { ok: true, identity: { ...user, roles: user.roles as RoleName[], sessionVersion: 1 } };
    } catch {
      return { ok: false, code: "IDENTITY_UNAVAILABLE", message: "Authentication is temporarily unavailable." };
    }
  }
  return resolveCurrentIdentityForApi(["STUDENT"]);
}

function identityError(result: Extract<CurrentIdentityResult, { ok: false }>) {
  return NextResponse.json(
    { error: result.message },
    { status: currentIdentityFailureStatus(result.code), headers: CURRENT_IDENTITY_PRIVATE_HEADERS },
  );
}

export async function handleProgressGet(request: Request, dependencies: ProgressDependencies = {}) {
  const identity = await resolveStudentIdentity(dependencies);
  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get("resourceId");

  if (!identity.ok) return identityError(identity);
  const user = identity.identity;
  if (!resourceId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const result = await (dependencies.getProgress ?? getStudentResourceProgress)({ user, resourceId });
  return NextResponse.json(result, { status: result.ok ? 200 : result.code === "FORBIDDEN" ? 403 : 404 });
}

export async function GET(request: Request) {
  return handleProgressGet(request);
}

export async function handleProgressPost(request: Request, dependencies: ProgressDependencies = {}) {
  const identity = await resolveStudentIdentity(dependencies);
  if (!identity.ok) return identityError(identity);
  const user = identity.identity;

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const resourceId = typeof payload.resourceId === "string" ? payload.resourceId : null;
  const page = typeof payload.page === "number" ? payload.page : undefined;
  const percent = typeof payload.percent === "number" ? payload.percent : undefined;
  const completed = typeof payload.completed === "boolean" ? payload.completed : false;

  if (!resourceId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  try {
    const limiter = dependencies.rateLimit ?? getRateLimitAdapter();
    const userDecision = await limiter.check("progress-user", user.id);
    if (!userDecision.allowed && userDecision.reason !== "backend-unavailable") {
      return rateLimitResponse(userDecision);
    }
    const resourceDecision = await limiter.check("progress-resource", `${user.id}\u0000${resourceId}`);
    if (!resourceDecision.allowed && resourceDecision.reason !== "backend-unavailable") {
      return rateLimitResponse(resourceDecision);
    }
  } catch {
    // Progress writes intentionally fail open when the distributed limiter is unavailable.
  }

  const result = await (dependencies.saveProgress ?? saveStudentResourceProgress)({
    user,
    resourceId,
    payload: { page, percent, completed },
  });

  if (!result.ok) {
    const status = result.code === "UNAUTHENTICATED" ? 401 : result.code === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: result.message }, { status });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return handleProgressPost(request);
}
