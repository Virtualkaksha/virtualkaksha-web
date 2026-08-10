import { NextResponse } from "next/server";
import type { RoleName } from "@/app/generated/prisma/enums";

import type { StudentUser } from "@/lib/resources/student-resource-service";
import { createResourceStorageProvider } from "@/lib/resources/storage-provider-factory";
import { isSupportedResourceStorageProviderName } from "@/lib/resources/storage";
import { PROTECTED_PDF_HEADERS } from "@/lib/security/headers";
import { resolveActiveAsset } from "@/lib/resources/active-asset";
import {
  CURRENT_IDENTITY_PRIVATE_HEADERS,
  currentIdentityFailureStatus,
  resolveCurrentIdentityForApi,
  type CurrentIdentityResult,
} from "@/lib/auth/current-identity";

type AdminAssetResource = {
  id: string;
  format: string;
  activeAssetId?: string | null;
  activeAsset?: { objectKey: string; provider: string; mimeType: string; status: string; isPrimary: boolean } | null;
  assets: Array<{
    objectKey: string;
    provider: string;
    mimeType: string;
    status: string;
    isPrimary: boolean;
  }>;
};

type AdminAssetDependencies = {
  resolveIdentity?: () => Promise<CurrentIdentityResult>;
  /** Test seam for an already-validated current identity. */
  getCurrentUser?: () => Promise<StudentUser | null>;
  findResource?: (resourceId: string) => Promise<AdminAssetResource | null>;
  readFile?: (provider: string, objectKey: string) => Promise<Buffer>;
};

async function resolveAdminIdentity(dependencies: AdminAssetDependencies): Promise<CurrentIdentityResult> {
  if (dependencies.resolveIdentity) return dependencies.resolveIdentity();
  if (dependencies.getCurrentUser) {
    try {
      const user = await dependencies.getCurrentUser();
      if (!user) return { ok: false, code: "NO_SESSION", message: "Authentication is required." };
      if (!user.roles.includes("ADMIN")) return { ok: false, code: "FORBIDDEN", message: "Access is denied." };
      return { ok: true, identity: { ...user, roles: user.roles as RoleName[], sessionVersion: 1 } };
    } catch {
      return { ok: false, code: "IDENTITY_UNAVAILABLE", message: "Authentication is temporarily unavailable." };
    }
  }
  return resolveCurrentIdentityForApi(["ADMIN"]);
}

function error(status: 401 | 403 | 404) {
  const message = status === 401 ? "Authentication required" : status === 403 ? "Forbidden" : "Not found";
  return NextResponse.json({ error: message }, { status });
}

function identityError(result: Extract<CurrentIdentityResult, { ok: false }>) {
  return NextResponse.json(
    { error: result.message },
    { status: currentIdentityFailureStatus(result.code), headers: CURRENT_IDENTITY_PRIVATE_HEADERS },
  );
}

function storageUnavailable() {
  return NextResponse.json(
    { error: "PDF is temporarily unavailable." },
    { status: 503, headers: CURRENT_IDENTITY_PRIVATE_HEADERS },
  );
}

export async function handleAdminAssetRequest(
  resourceId: string,
  dependencies: AdminAssetDependencies = {},
) {
  const identity = await resolveAdminIdentity(dependencies);
  if (!identity.ok) return identityError(identity);
  if (!resourceId.trim()) return error(404);

  const findResource = dependencies.findResource ?? (async (id: string) => {
    const runtimePrisma = await import("@/lib/prisma").then((module) => module.default);
    return runtimePrisma.resource.findUnique({
      where: { id },
      select: {
        id: true,
        format: true,
        activeAssetId: true,
        activeAsset: { select: { objectKey: true, provider: true, mimeType: true, status: true, isPrimary: true } },
        assets: {
          where: { isPrimary: true },
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
          take: 1,
          select: {
            objectKey: true,
            provider: true,
            mimeType: true,
            status: true,
            isPrimary: true,
          },
        },
      },
    });
  });
  const resource = await findResource(resourceId);
  const asset = resource ? resolveActiveAsset(resource) : null;
  if (resource?.format !== "PDF" || !asset || !asset.isPrimary || asset.status !== "READY") return error(404);
  if (
    !isSupportedResourceStorageProviderName(asset.provider)
    || !["application/pdf", "application/x-pdf"].includes(asset.mimeType.toLowerCase())
  ) return error(404);

  const readFile = dependencies.readFile
    ?? ((provider: string, objectKey: string) => createResourceStorageProvider(provider).readFile(objectKey));
  let buffer: Buffer;
  try {
    buffer = await readFile(asset.provider, asset.objectKey);
  } catch {
    return storageUnavailable();
  }
  if (!buffer || !buffer.subarray(0, 4).equals(Buffer.from("%PDF"))) return error(404);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: PROTECTED_PDF_HEADERS,
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params;
  return handleAdminAssetRequest(resourceId);
}
