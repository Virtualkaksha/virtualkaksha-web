import { NextResponse } from "next/server";

import { getCurrentUserIdentity, type StudentUser } from "@/lib/resources/student-resource-service";
import { LocalResourceStorageProvider } from "@/lib/resources/local-storage-provider";

type TeacherAssetResource = {
  id: string;
  createdByUserId: string | null;
  format: string;
  assets: Array<{ objectKey: string; provider: string; mimeType: string; status: string; isPrimary: boolean }>;
};

type Dependencies = {
  getCurrentUser?: () => Promise<StudentUser | null>;
  findResource?: (resourceId: string) => Promise<TeacherAssetResource | null>;
  readLocalFile?: (objectKey: string) => Promise<Buffer>;
};

function error(status: number) {
  return NextResponse.json({ error: status === 401 ? "Authentication required" : status === 403 ? "Forbidden" : "Not found" }, { status });
}

export async function handleTeacherAssetRequest(resourceId: string, dependencies: Dependencies = {}) {
  const user = await (dependencies.getCurrentUser ?? getCurrentUserIdentity)();
  if (!user?.id) return error(401);
  if (!user.roles.includes("TEACHER") && !user.roles.includes("ADMIN")) return error(403);
  if (!resourceId.trim()) return error(404);

  const findResource = dependencies.findResource ?? (async (id: string) => {
    const runtimePrisma = await import("@/lib/prisma").then((module) => module.default);
    return runtimePrisma.resource.findFirst({
      where: {
        id,
        ...(user.roles.includes("ADMIN") ? {} : { createdByUserId: user.id }),
        status: { in: ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "ARCHIVED"] },
      },
      select: {
        id: true,
        createdByUserId: true,
        format: true,
        assets: { where: { isPrimary: true }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 1, select: { objectKey: true, provider: true, mimeType: true, status: true, isPrimary: true } },
      },
    });
  });
  const resource = await findResource(resourceId);
  if (!resource) return error(404);
  if (!user.roles.includes("ADMIN") && resource.createdByUserId !== user.id) return error(404);
  const asset = resource.assets[0];
  if (resource.format !== "PDF" || !asset || asset.status !== "READY" || !asset.isPrimary) return error(404);
  if (asset.provider !== "local" || !["application/pdf", "application/x-pdf"].includes(asset.mimeType.toLowerCase())) return error(404);

  const readLocalFile = dependencies.readLocalFile ?? ((objectKey: string) => new LocalResourceStorageProvider().readFile(objectKey));
  const buffer = await readLocalFile(asset.objectKey).catch(() => null);
  if (!buffer || !buffer.subarray(0, 4).equals(Buffer.from("%PDF"))) return error(404);

  return new NextResponse(new Uint8Array(buffer), {
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
  return handleTeacherAssetRequest(resourceId);
}
