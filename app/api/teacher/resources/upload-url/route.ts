import { NextResponse } from "next/server";

import {
  CURRENT_IDENTITY_PRIVATE_HEADERS,
  currentIdentityFailureStatus,
  resolveCurrentIdentityForApi,
  type CurrentIdentityResult,
} from "@/lib/auth/current-identity";
import { getStorageEnvironment } from "@/lib/env";
import {
  enforceRateLimitChecks,
  rateLimitResponse,
  resolveRequestClientIp,
  type RateLimitAdapter,
} from "@/lib/rate-limit";
import { buildPendingUploadObjectKey } from "@/lib/resources/pending-upload";
import { supportsPresignedTransfer, type ResourceStorageProvider } from "@/lib/resources/storage";
import { createResourceStorageProvider } from "@/lib/resources/storage-provider-factory";

const PRIVATE_JSON_HEADERS = { "Cache-Control": "private, no-store" } as const;

type Dependencies = {
  resolveIdentity?: () => Promise<CurrentIdentityResult>;
  resolveIp?: (request: Request) => ReturnType<typeof resolveRequestClientIp>;
  rateLimit?: RateLimitAdapter;
  createProvider?: () => ResourceStorageProvider;
  uploadMaxMb?: number;
};

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status, headers: PRIVATE_JSON_HEADERS });
}

/**
 * Issues a short-lived URL that lets the browser upload a PDF straight to
 * storage, because hosts such as Vercel cap function bodies below the upload
 * limit. The key is generated here and namespaced to the caller, so a client
 * can never choose where its bytes land.
 */
export async function handleTeacherUploadUrlRequest(
  request: Request,
  dependencies: Dependencies = {},
) {
  const identity = await (dependencies.resolveIdentity ?? (() => resolveCurrentIdentityForApi(["TEACHER", "ADMIN"])))();
  if (!identity.ok) {
    return NextResponse.json(
      { ok: false, message: identity.message },
      { status: currentIdentityFailureStatus(identity.code), headers: CURRENT_IDENTITY_PRIVATE_HEADERS },
    );
  }
  const user = identity.identity;

  const ipResult = (dependencies.resolveIp ?? ((value) => resolveRequestClientIp(value)))(request);
  if (!ipResult.ok) return jsonError(503, "Uploads are temporarily unavailable.");

  const decision = await enforceRateLimitChecks([
    { policy: "pdf-upload-user", identifier: user.id },
    { policy: "pdf-upload-ip", identifier: ipResult.address },
  ], dependencies.rateLimit);
  if (decision) {
    return decision.reason === "limited"
      ? rateLimitResponse(decision)
      : jsonError(503, "Uploads are temporarily unavailable.");
  }

  let provider: ResourceStorageProvider;
  try {
    provider = (dependencies.createProvider ?? (() => createResourceStorageProvider()))();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[upload-url] storage provider is not configured", error);
    }
    return jsonError(503, "Uploads are temporarily unavailable.");
  }

  // Where no body cap applies the existing single-request upload is simpler and
  // keeps one code path in local development.
  if (!supportsPresignedTransfer(provider)) {
    return NextResponse.json({ ok: true, mode: "buffered" }, { headers: PRIVATE_JSON_HEADERS });
  }

  const uploadMaxMb = dependencies.uploadMaxMb ?? getStorageEnvironment().uploadMaxMb;
  try {
    const presigned = await provider.createUploadUrl({ objectKey: buildPendingUploadObjectKey(user.id) });
    return NextResponse.json({
      ok: true,
      mode: "presigned",
      url: presigned.url,
      objectKey: presigned.objectKey,
      requiredContentType: presigned.requiredContentType,
      expiresInSeconds: presigned.expiresInSeconds,
      maxBytes: uploadMaxMb * 1024 * 1024,
    }, { headers: PRIVATE_JSON_HEADERS });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[upload-url] could not create a staging URL", error);
    }
    return jsonError(503, "Uploads are temporarily unavailable.");
  }
}

export async function POST(request: Request) {
  return handleTeacherUploadUrlRequest(request);
}
