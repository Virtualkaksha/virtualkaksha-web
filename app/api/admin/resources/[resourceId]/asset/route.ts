import { NextResponse } from "next/server";

import { getCurrentUserIdentity, type StudentUser } from "@/lib/resources/student-resource-service";
import { createResourceStorageProvider } from "@/lib/resources/storage-provider-factory";
import { isSupportedResourceStorageProviderName } from "@/lib/resources/storage";

type AdminAssetResource = {
  id: string;
  format: string;
  assets: Array<{
    objectKey: string;
    provider: string;
    mimeType: string;
    status: string;
    isPrimary: boolean;
  }>;
};

type AdminAssetDependencies = {
  getCurrentUser?: () => Promise<StudentUser | null>;
  findResource?: (resourceId: string) => Promise<AdminAssetResource | null>;
  readFile?: (provider: string, objectKey: string) => Promise<Buffer>;
};

function error(status: 401 | 403 | 404) {
  const message = status === 401 ? "Authentication required" : status === 403 ? "Forbidden" : "Not found";
  return NextResponse.json({ error: message }, { status });
}

export async function handleAdminAssetRequest(
  resourceId: string,
  dependencies: AdminAssetDependencies = {},
) {
  const user = await (dependencies.getCurrentUser ?? getCurrentUserIdentity)();
  if (!user?.id) return error(401);
  if (!user.roles.includes("ADMIN")) return error(403);
  if (!resourceId.trim()) return error(404);

  const findResource = dependencies.findResource ?? (async (id: string) => {
    const runtimePrisma = await import("@/lib/prisma").then((module) => module.default);
    return runtimePrisma.resource.findUnique({
      where: { id },
      select: {
        id: true,
        format: true,
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
  const asset = resource?.assets[0] ?? null;
  if (resource?.format !== "PDF" || !asset || !asset.isPrimary || asset.status !== "READY") return error(404);
  if (
    !isSupportedResourceStorageProviderName(asset.provider)
    || !["application/pdf", "application/x-pdf"].includes(asset.mimeType.toLowerCase())
  ) return error(404);

  const readFile = dependencies.readFile
    ?? ((provider: string, objectKey: string) => createResourceStorageProvider(provider).readFile(objectKey));
  const buffer = await readFile(asset.provider, asset.objectKey).catch(() => null);
  if (!buffer || !buffer.subarray(0, 4).equals(Buffer.from("%PDF"))) return error(404);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="resource.pdf"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params;
  return handleAdminAssetRequest(resourceId);
}
