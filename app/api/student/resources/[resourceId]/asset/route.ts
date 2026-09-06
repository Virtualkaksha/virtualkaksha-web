import { NextResponse } from "next/server";
import type { RoleName } from "@/app/generated/prisma/enums";

import { createResourceStorageProvider } from "@/lib/resources/storage-provider-factory";
import { presignedPdfResponse } from "@/lib/resources/pdf-delivery";
import { resolveActiveAsset } from "@/lib/resources/active-asset";
import { PROTECTED_PDF_HEADERS } from "@/lib/security/headers";
import {
  authorizeStudentResourceAssetAccess,
  type StudentUser,
} from "@/lib/resources/student-resource-service";
import {
  CURRENT_IDENTITY_PRIVATE_HEADERS,
  currentIdentityFailureStatus,
  resolveCurrentIdentityForApi,
  type CurrentIdentityResult,
} from "@/lib/auth/current-identity";

type AssetResource = {
  id: string;
  format: string;
  access: string;
  status: string;
  activeAssetId?: string | null;
  activeAsset?: { id: string; objectKey: string; provider: string; mimeType: string; status: string; isPrimary: boolean } | null;
  assets: Array<{
    id: string;
    objectKey: string;
    provider: string;
    mimeType: string;
    status: string;
    isPrimary: boolean;
  }>;
};

type AssetRouteDependencies = {
  resolveIdentity?: () => Promise<CurrentIdentityResult>;
  /** Test seam for an already-validated current identity. */
  getCurrentUser?: () => Promise<StudentUser | null>;
  findResource?: (resourceId: string) => Promise<AssetResource | null>;
  readFile?: (provider: string, objectKey: string) => Promise<Buffer>;
  readLocalFile?: (objectKey: string) => Promise<Buffer>;
};

async function resolveOptionalStudentIdentity(dependencies: AssetRouteDependencies): Promise<
  | { ok: true; user: StudentUser | null }
  | Extract<CurrentIdentityResult, { ok: false }>
> {
  if (dependencies.resolveIdentity) {
    const result = await dependencies.resolveIdentity();
    if (result.ok) return { ok: true, user: result.identity };
    if (result.code === "NO_SESSION") return { ok: true, user: null };
    return result;
  }
  if (dependencies.getCurrentUser) {
    try {
      const user = await dependencies.getCurrentUser();
      if (!user) return { ok: true, user: null };
      if (!user.roles.includes("STUDENT")) return { ok: false, code: "FORBIDDEN", message: "Access is denied." };
      return { ok: true, user: { ...user, roles: user.roles as RoleName[] } };
    } catch {
      return { ok: false, code: "IDENTITY_UNAVAILABLE", message: "Authentication is temporarily unavailable." };
    }
  }
  const result = await resolveCurrentIdentityForApi(["STUDENT"]);
  if (result.ok) return { ok: true, user: result.identity };
  if (result.code === "NO_SESSION") return { ok: true, user: null };
  return result;
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

function accessStatus(code: string) {
  if (code === "UNAUTHENTICATED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "UNSUPPORTED_PROVIDER") return 501;
  return 404;
}

export async function handleStudentAssetRequest(resourceId: string, dependencies: AssetRouteDependencies = {}) {
  const identity = await resolveOptionalStudentIdentity(dependencies);
  if (!identity.ok) return identityError(identity);
  const user = identity.user;

  const findResource = dependencies.findResource ?? (async (id: string) => {
    const runtimePrisma = await import("@/lib/prisma").then((module) => module.default);
    return runtimePrisma.resource.findUnique({
      where: { id },
      select: {
        id: true,
        format: true,
        access: true,
        status: true,
        activeAssetId: true,
        activeAsset: { select: { id: true, objectKey: true, provider: true, mimeType: true, status: true, isPrimary: true } },
        assets: {
          where: { isPrimary: true },
          orderBy: { createdAt: "asc" },
          select: { id: true, objectKey: true, provider: true, mimeType: true, status: true, isPrimary: true },
        },
      },
    });
  });
  const resource = await findResource(resourceId);
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const asset = resolveActiveAsset(resource);
  const authorization = authorizeStudentResourceAssetAccess({ user, resource, asset });
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: accessStatus(authorization.code) });
  }

  const suppliesOwnBytes = Boolean(dependencies.readFile ?? dependencies.readLocalFile);
  const redirect = await presignedPdfResponse(asset!, { skip: suppliesOwnBytes });
  if (redirect) return redirect;

  const readFile = dependencies.readFile
    ?? (dependencies.readLocalFile ? (_provider: string, objectKey: string) => dependencies.readLocalFile!(objectKey) : null)
    ?? ((provider: string, objectKey: string) => createResourceStorageProvider(provider).readFile(objectKey));
  let buffer: Buffer;
  try {
    buffer = await readFile(asset!.provider!, asset!.objectKey);
  } catch {
    return storageUnavailable();
  }
  if (!buffer || !buffer.subarray(0, 4).equals(Buffer.from("%PDF"))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: PROTECTED_PDF_HEADERS,
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params;
  return handleStudentAssetRequest(resourceId);
}
