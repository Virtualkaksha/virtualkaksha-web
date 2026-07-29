import { NextResponse } from "next/server";

import { LocalResourceStorageProvider } from "@/lib/resources/local-storage-provider";
import {
  authorizeStudentResourceAssetAccess,
  getCurrentUserIdentity,
  type StudentUser,
} from "@/lib/resources/student-resource-service";

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
  getCurrentUser?: () => Promise<StudentUser | null>;
  findResource?: (resourceId: string) => Promise<AssetResource | null>;
  readLocalFile?: (objectKey: string) => Promise<Buffer>;
};

function accessStatus(code: string) {
  if (code === "UNAUTHENTICATED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "UNSUPPORTED_PROVIDER") return 501;
  return 404;
}

export async function handleStudentAssetRequest(resourceId: string, dependencies: AssetRouteDependencies = {}) {
  const user = await (dependencies.getCurrentUser ?? getCurrentUserIdentity)();
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

  const readLocalFile = dependencies.readLocalFile ?? ((objectKey: string) => new LocalResourceStorageProvider().readFile(objectKey));
  const buffer = await readLocalFile(asset!.objectKey).catch(() => null);
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
