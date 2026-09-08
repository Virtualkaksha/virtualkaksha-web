import { NextResponse } from "next/server";
import type { RoleName } from "@/app/generated/prisma/enums";

import { createTeacherResourceCore, type TeacherResourceActionResult } from "@/app/teacher/resources/actions";
import type { StudentUser } from "@/lib/resources/student-resource-service";
import {
  CURRENT_IDENTITY_PRIVATE_HEADERS,
  currentIdentityFailureStatus,
  resolveCurrentIdentityForApi,
  type CurrentIdentityResult,
} from "@/lib/auth/current-identity";
import {
  enforceRateLimitChecks,
  rateLimitResponse,
  resolveRequestClientIp,
  type RateLimitAdapter,
} from "@/lib/rate-limit";

const MAX_MULTIPART_BODY_BYTES = 21 * 1024 * 1024;

type Dependencies = {
  resolveIdentity?: () => Promise<CurrentIdentityResult>;
  /** Test seam for an already-validated current identity. */
  getCurrentUser?: () => Promise<StudentUser | null>;
  resolveIp?: (request: Request) => ReturnType<typeof resolveRequestClientIp>;
  rateLimit?: RateLimitAdapter;
  parseFormData?: (request: Request) => Promise<FormData>;
  createResource?: (user: StudentUser, formData: FormData) => Promise<TeacherResourceActionResult>;
};

async function resolveTeacherIdentity(dependencies: Dependencies): Promise<CurrentIdentityResult> {
  if (dependencies.resolveIdentity) return dependencies.resolveIdentity();
  if (dependencies.getCurrentUser) {
    try {
      const user = await dependencies.getCurrentUser();
      if (!user) return { ok: false, code: "NO_SESSION", message: "Authentication is required." };
      if (!user.roles.includes("TEACHER") && !user.roles.includes("ADMIN")) {
        return { ok: false, code: "FORBIDDEN", message: "Access is denied." };
      }
      return { ok: true, identity: { ...user, roles: user.roles as RoleName[], sessionVersion: 1 } };
    } catch {
      return { ok: false, code: "IDENTITY_UNAVAILABLE", message: "Authentication is temporarily unavailable." };
    }
  }
  return resolveCurrentIdentityForApi(["TEACHER", "ADMIN"]);
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function handleNativeTeacherResourceCreation(request: Request, dependencies: Dependencies = {}) {
  const identity = await resolveTeacherIdentity(dependencies);
  if (!identity.ok) {
    return NextResponse.json(
      { error: identity.message },
      { status: currentIdentityFailureStatus(identity.code), headers: CURRENT_IDENTITY_PRIVATE_HEADERS },
    );
  }
  const user = identity.identity;

  const ipResult = (dependencies.resolveIp ?? ((value) => resolveRequestClientIp(value)))(request);
  if (!ipResult.ok) return jsonError(503, "Resource creation is temporarily unavailable.");
  const decision = await enforceRateLimitChecks([
    { policy: "resource-create-user", identifier: user.id },
    { policy: "resource-create-ip", identifier: ipResult.address },
    { policy: "pdf-upload-user", identifier: user.id },
    { policy: "pdf-upload-ip", identifier: ipResult.address },
  ], dependencies.rateLimit);
  if (decision) return decision.reason === "limited"
    ? rateLimitResponse(decision)
    : jsonError(503, "Resource creation is temporarily unavailable.");

  const rawLength = request.headers.get("content-length");
  if (rawLength) {
    const contentLength = Number(rawLength);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0 || contentLength > MAX_MULTIPART_BODY_BYTES) {
      return jsonError(413, "The upload is too large.");
    }
  }

  const formData = await (dependencies.parseFormData ?? ((value) => value.formData()))(request).catch(() => null);
  if (!formData) return jsonError(400, "The upload request is invalid.");
  if (formData.get("format") !== "PDF" || formData.get("sourceType") !== "native-pdf") {
    return jsonError(400, "This endpoint accepts native PDF resources only.");
  }

  const result = await (dependencies.createResource
    ?? ((identity, data) => createTeacherResourceCore({ user: identity, formData: data })))(user, formData);
  return NextResponse.json(result, {
    status: result.ok ? 200 : result.code === "UNAUTHENTICATED" ? 401 : result.code === "FORBIDDEN" ? 403 : 400,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  try {
    return await handleNativeTeacherResourceCreation(request);
  } catch {
    return jsonError(503, "The resource could not be saved. Please try again.");
  }
}
