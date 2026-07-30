import { randomUUID } from "node:crypto";

import { createResourceStorageProvider } from "./storage-provider-factory";
import { computeChecksum } from "./storage";
import type { ResourceStorageProvider } from "./storage";

export type UploadFileLike = {
  name: string;
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

type UploadResourceAssetInput = {
  user: { id: string; roles: string[] };
  resourceId: string;
  file: UploadFileLike;
};

export type UploadResourceAssetResult =
  | { ok: true; assetId: string; objectKey: string; readUrl: string }
  | { ok: false; code: string; message: string };

type ResourceLookup = {
  id: string;
  format: string;
  createdByUserId: string | null;
  teachers: Array<{ teacherProfile?: { userId: string | null } }>;
};

type ResourceAssetRecord = {
  id: string;
};

type UploadDependencies = {
  prismaClient?: {
    resource: {
      findUnique: (args: { where: { id: string }; select: Record<string, unknown> }) => Promise<ResourceLookup | null>;
      update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
    };
    resourceAsset: {
      create: (args: { data: Record<string, unknown> }) => Promise<ResourceAssetRecord>;
      update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
      delete: (args: { where: { id: string } }) => Promise<unknown>;
    };
  };
  storageProvider?: ResourceStorageProvider;
};

const PDF_MAGIC_BYTES = Buffer.from("%PDF");
const DEFAULT_MAX_MB = 20;

function sanitizeFileName(fileName: string) {
  const baseName = fileName.replace(/\\/g, "/").split("/").pop() ?? "resource.pdf";
  const clean = baseName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return clean || "resource.pdf";
}

function buildObjectKey(resourceId: string, fileName: string) {
  sanitizeFileName(fileName);
  return `resources/${resourceId}/${randomUUID()}.pdf`;
}

async function readFileBuffer(file: UploadFileLike) {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function parseMaxMb(rawValue?: string) {
  const value = Number(rawValue ?? DEFAULT_MAX_MB);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_MB;
}

export function validatePdfUpload(file: UploadFileLike, buffer: Buffer, rawMaxMb?: string) {
  const lowerName = file.name.toLowerCase();
  const mimeType = file.type?.trim().toLowerCase();

  if (!lowerName.endsWith(".pdf")) {
    return { ok: false as const, code: "INVALID_EXTENSION", message: "Only PDF files are supported." };
  }

  if (mimeType && !["application/pdf", "application/x-pdf"].includes(mimeType)) {
    return { ok: false as const, code: "INVALID_MIME", message: "The file type is not a valid PDF." };
  }

  if (!buffer || buffer.length === 0) {
    return { ok: false as const, code: "EMPTY_FILE", message: "The selected file is empty." };
  }

  if (!buffer.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES)) {
    return { ok: false as const, code: "INVALID_SIGNATURE", message: "The uploaded file is not a valid PDF." };
  }

  const maxMb = parseMaxMb(rawMaxMb);
  const maxBytes = maxMb * 1024 * 1024;
  if (buffer.length > maxBytes) {
    return { ok: false as const, code: "FILE_TOO_LARGE", message: `File exceeds the ${maxMb}MB upload limit.` };
  }

  return { ok: true as const };
}

export async function uploadResourceAsset({ user, resourceId, file }: UploadResourceAssetInput, dependencies: UploadDependencies = {}): Promise<UploadResourceAssetResult> {
  if (!user.id) {
    return { ok: false, code: "UNAUTHENTICATED", message: "You need to sign in before uploading a resource." };
  }

  if (!user.roles.includes("ADMIN") && !user.roles.includes("TEACHER")) {
    return { ok: false, code: "FORBIDDEN", message: "Only teachers and admins can upload resources." };
  }

  const runtimePrismaClient = dependencies.prismaClient ?? (await import("@/lib/prisma").then((mod) => mod.default));
  const prismaClient = runtimePrismaClient as NonNullable<typeof dependencies.prismaClient>;
  try {
    const storage = dependencies.storageProvider ?? createResourceStorageProvider();
    const resource = await prismaClient.resource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        format: true,
        createdByUserId: true,
        teachers: { select: { teacherProfile: { select: { userId: true } } } },
      },
    });

    if (!resource) {
      return { ok: false, code: "RESOURCE_NOT_FOUND", message: "The selected resource could not be found." };
    }

    if (resource.format !== "PDF") {
      return { ok: false, code: "INVALID_FORMAT", message: "Only PDF uploads are supported for this step." };
    }

    const isAdmin = user.roles.includes("ADMIN");
    const isOwner = resource.createdByUserId === user.id;
    const ownsThroughTeacherLink = resource.teachers.some((link) => link.teacherProfile?.userId === user.id);
    if (!isAdmin && !isOwner && !ownsThroughTeacherLink) {
      return { ok: false, code: "FORBIDDEN", message: "You do not have permission to upload to this resource." };
    }

    const buffer = await readFileBuffer(file);
    const validation = validatePdfUpload(file, buffer, process.env.RESOURCE_UPLOAD_MAX_MB);
    if (!validation.ok) {
      return validation;
    }

    const objectKey = buildObjectKey(resourceId, file.name);
    const mimeType = "application/pdf";

    const asset = await prismaClient.resourceAsset.create({
      data: {
        resourceId,
        provider: storage.providerName,
        objectKey,
        originalFileName: file.name,
        mimeType,
        sizeBytes: BigInt(buffer.length),
        checksum: computeChecksum(buffer),
        status: "UPLOADING",
        isPrimary: true,
      },
    });

    try {
      const storageResult = await storage.upload({
        objectKey,
        originalFileName: file.name,
        mimeType,
        sizeBytes: buffer.length,
        buffer,
      });

      await prismaClient.resourceAsset.update({
        where: { id: asset.id },
        data: {
          objectKey: storageResult.objectKey,
          provider: storageResult.provider,
          mimeType: storageResult.mimeType,
          sizeBytes: BigInt(storageResult.sizeBytes),
          checksum: storageResult.checksum,
          status: "READY",
          updatedAt: new Date(),
        },
      });

      await prismaClient.resource.update({
        where: { id: resourceId },
        data: {
          contentUrl: null,
          fileSizeBytes: BigInt(storageResult.sizeBytes),
          updatedAt: new Date(),
        },
      });

      return { ok: true, assetId: asset.id, objectKey: storageResult.objectKey, readUrl: storageResult.readUrl };
    } catch {
      await prismaClient.resourceAsset.delete({ where: { id: asset.id } }).catch(() => undefined);
      await storage.delete(objectKey).catch(() => undefined);
      return { ok: false, code: "UPLOAD_FAILED", message: "The file could not be stored. Please try again." };
    }
  } catch {
    return { ok: false, code: "UPLOAD_FAILED", message: "The file could not be stored. Please try again." };
  }
}
