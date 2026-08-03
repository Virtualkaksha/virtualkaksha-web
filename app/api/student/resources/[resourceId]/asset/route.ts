import { NextResponse } from "next/server";
import type { RoleName } from "@/app/generated/prisma/enums";

import { createResourceStorageProvider } from "@/lib/resources/storage-provider-factory";
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

async function resolveStudentIdentity(dependencies: AssetRouteDependencies): Promise<CurrentIdentityResult> {
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

function accessStatus(code: string) {
  if (code === "UNAUTHENTICATED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "UNSUPPORTED_PROVIDER") return 501;
  return 404;
}

export async function handleStudentAssetRequest(resourceId: string, dependencies: AssetRouteDependencies = {}) {
  const identity = await resolveStudentIdentity(dependencies);
  if (!identity.ok) return identityError(identity);
  const user = identity.identity;
  const findResource = dependencies.findResource ?? (async (id: string) => {
    const runtimePrisma = await import("@/lib/prisma").then((module) => module.default);
    return runtimePrisma.resource.findUnique({
      where: { id },
      select: {
        id: true,
        format: true,
        access: true,
        status: true,
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

  const asset = resource.assets[0] ?? null;
  const authorization = authorizeStudentResourceAssetAccess({ user, resource, asset });
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.message }, { status: accessStatus(authorization.code) });
  }

  const readFile = dependencies.readFile
    ?? (dependencies.readLocalFile ? (_provider: string, objectKey: string) => dependencies.readLocalFile!(objectKey) : null)
    ?? ((provider: string, objectKey: string) => createResourceStorageProvider(provider).readFile(objectKey));
  const buffer = await readFile(asset!.provider!, asset!.objectKey).catch(() => null);
  if (!buffer || !buffer.subarray(0, 4).equals(Buffer.from("%PDF"))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store",
      "Content-Disposition": 'inline; filename="resource.pdf"',
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params;
  return handleStudentAssetRequest(resourceId);
}
