import { NextResponse } from "next/server";

import { CURRENT_IDENTITY_PRIVATE_HEADERS, currentIdentityFailureStatus, resolveCurrentIdentityForApi, type CurrentIdentityResult } from "@/lib/auth/current-identity";
import { parseResourceImportCsv, RESOURCE_IMPORT_MAX_BYTES } from "@/lib/admin/resource-import-csv";
import { previewResourceImport } from "@/lib/admin/resource-import-preview";
import { enforceRateLimitChecks, rateLimitResponse, resolveTrustedClientIp, type RateLimitAdapter } from "@/lib/rate-limit";
import { isSameOriginAction } from "@/lib/security/same-origin-action";

const MAX_MULTIPART_BODY_BYTES = RESOURCE_IMPORT_MAX_BYTES + 64 * 1024;
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" } as const;

type Dependencies = {
  resolveIdentity?: () => Promise<CurrentIdentityResult>;
  resolveIp?: (request: Request) => ReturnType<typeof resolveTrustedClientIp>;
  rateLimit?: RateLimitAdapter;
  parseFormData?: (request: Request) => Promise<FormData>;
  preview?: typeof previewResourceImport;
};

function error(status: number, message: string) { return NextResponse.json({ error: message }, { status, headers: PRIVATE_HEADERS }); }

export async function handleResourceImportPreview(request: Request, dependencies: Dependencies = {}) {
  if (!isSameOriginAction(request.headers)) return error(403, "The request could not be verified.");
  const identity = await (dependencies.resolveIdentity ?? (() => resolveCurrentIdentityForApi(["ADMIN"])))();
  if (!identity.ok) return NextResponse.json({ error: identity.message }, { status: currentIdentityFailureStatus(identity.code), headers: CURRENT_IDENTITY_PRIVATE_HEADERS });
  const ip = (dependencies.resolveIp ?? ((value) => resolveTrustedClientIp({ request: value, directAddress: process.env.NODE_ENV === "development" ? "127.0.0.1" : null })))(request);
  if (!ip.ok) return error(503, "CSV preview is temporarily unavailable.");
  const limited = await enforceRateLimitChecks([
    { policy: "admin-import-preview-user", identifier: identity.identity.id },
    { policy: "admin-import-preview-ip", identifier: ip.address },
  ], dependencies.rateLimit);
  if (limited) return limited.reason === "limited" ? rateLimitResponse(limited) : error(503, "CSV preview is temporarily unavailable.");

  const rawLength = request.headers.get("content-length");
  if (rawLength) {
    const length = Number(rawLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > MAX_MULTIPART_BODY_BYTES) return error(413, "The CSV upload is too large.");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) return error(415, "A multipart CSV upload is required.");
  const form = await (dependencies.parseFormData ?? ((value) => value.formData()))(request).catch(() => null);
  if (!form) return error(400, "The CSV upload is invalid.");
  if ([...new Set(form.keys())].some((key) => key !== "file") || form.getAll("file").length !== 1) return error(400, "Exactly one CSV file is required.");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return error(400, "Exactly one non-empty CSV file is required.");
  if (file.size > RESOURCE_IMPORT_MAX_BYTES) return error(413, "The CSV file exceeds 2 MiB.");
  try {
    const parsed = parseResourceImportCsv(new Uint8Array(await file.arrayBuffer()));
    const result = await (dependencies.preview ?? previewResourceImport)(parsed);
    return NextResponse.json(result, { headers: PRIVATE_HEADERS });
  } catch (failure) {
    const message = failure instanceof Error && failure.name === "ResourceImportCsvError" ? failure.message : "The CSV preview could not be produced.";
    return error(failure instanceof Error && failure.name === "ResourceImportCsvError" ? 400 : 503, message);
  }
}

export async function POST(request: Request) { return handleResourceImportPreview(request); }
