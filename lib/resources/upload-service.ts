import { randomUUID } from "node:crypto";

import { getStorageEnvironment } from "@/lib/env";
import { createResourceStorageProvider } from "./storage-provider-factory";
import { computeChecksum, PDF_CONTENT_TYPE, supportsPresignedTransfer } from "./storage";
import { buildResourceAssetObjectKey, isPendingUploadOwnedBy } from "./pending-upload";
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
  activeAssetId?: string | null;
  assets?: Array<{ assetVersion: number }>;
};

type ResourceAssetRecord = {
  id: string;
};

type UploadDependencies = {
  prismaClient?: {
    resource: {
      findUnique: (args: { where: { id: string }; select: Record<string, unknown> }) => Promise<ResourceLookup | null>;
      update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
      updateMany?: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<{ count: number }>;
    };
    $transaction?: <T>(callback: (transaction: NonNullable<UploadDependencies["prismaClient"]>) => Promise<T>) => Promise<T>;
    resourceAsset: {
      create: (args: { data: Record<string, unknown> }) => Promise<ResourceAssetRecord>;
      update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
      delete: (args: { where: { id: string } }) => Promise<unknown>;
    };
  };
  storageProvider?: ResourceStorageProvider;
  uploadMaxMb?: number;
};

const PDF_MAGIC_BYTES = Buffer.from("%PDF");
const DEFAULT_MAX_MB = 20;

const RESOURCE_UPLOAD_SELECT = {
  id: true,
  format: true,
  createdByUserId: true,
  teachers: { select: { teacherProfile: { select: { userId: true } } } },
  activeAssetId: true,
  assets: { orderBy: { assetVersion: "desc" }, take: 1, select: { assetVersion: true } },
} as const;

type UploadRejection = { ok: false; code: string; message: string };

/** Shared by the buffered and direct-upload paths so both enforce one policy. */
function authorizeResourceUpload(
  user: { id: string; roles: string[] },
  resource: ResourceLookup | null,
): UploadRejection | { ok: true; resource: ResourceLookup } {
  if (!resource) {
    return { ok: false, code: "RESOURCE_NOT_FOUND", message: "The selected resource could not be found." };
  }
  if (resource.format !== "PDF") {
    return { ok: false, code: "INVALID_FORMAT", message: "Only PDF uploads are supported for this step." };
  }
  if (resource.activeAssetId) {
    return { ok: false, code: "REPLACEMENT_REQUIRED", message: "This resource already has an active PDF. Use the replacement workflow." };
  }

  const isAdmin = user.roles.includes("ADMIN");
  const isOwner = resource.createdByUserId === user.id;
  const ownsThroughTeacherLink = resource.teachers.some((link) => link.teacherProfile?.userId === user.id);
  if (!isAdmin && !isOwner && !ownsThroughTeacherLink) {
    return { ok: false, code: "FORBIDDEN", message: "You do not have permission to upload to this resource." };
  }

  return { ok: true, resource };
}

/**
 * Marks the asset ready and claims the resource's active slot. The conditional
 * updateMany is the concurrency guard: a second upload finding the slot taken
 * fails instead of silently replacing a live asset.
 */
async function activateStoredAsset(
  prismaClient: NonNullable<UploadDependencies["prismaClient"]>,
  input: {
    assetId: string;
    resourceId: string;
    objectKey: string;
    provider: string;
    mimeType: string;
    sizeBytes: number;
    checksum: string | null;
  },
) {
  const finalize = async (database: NonNullable<UploadDependencies["prismaClient"]>) => {
    await database.resourceAsset.update({
      where: { id: input.assetId },
      data: {
        objectKey: input.objectKey,
        provider: input.provider,
        mimeType: input.mimeType,
        sizeBytes: BigInt(input.sizeBytes),
        checksum: input.checksum,
        status: "READY",
        activatedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    if (database.resource.updateMany) {
      const activated = await database.resource.updateMany({
        where: { id: input.resourceId, activeAssetId: null },
        data: {
          activeAssetId: input.assetId,
          contentUrl: null,
          fileSizeBytes: BigInt(input.sizeBytes),
          updatedAt: new Date(),
        },
      });
      if (activated.count !== 1) throw new Error("Active asset changed during upload.");
    } else {
      await database.resource.update({
        where: { id: input.resourceId },
        data: {
          activeAssetId: input.assetId,
          contentUrl: null,
          fileSizeBytes: BigInt(input.sizeBytes),
          updatedAt: new Date(),
        },
      });
    }
  };

  if (prismaClient.$transaction) await prismaClient.$transaction(finalize);
  else await finalize(prismaClient);
}

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

export type RegisterUploadedResourceAssetInput = {
  user: { id: string; roles: string[] };
  resourceId: string;
  /** Staging key the browser uploaded to. Supplied by the client, so never trusted. */
  objectKey: string;
  originalFileName: string;
};

/**
 * Registers a PDF the browser uploaded straight to storage.
 *
 * The bytes never reach the application, so nothing the client claims about the
 * file is believed: the stored object is inspected for size, type and PDF magic
 * bytes, and the staging key must name the calling user. Only then is the object
 * moved to its permanent key and activated.
 */
export async function registerUploadedResourceAsset(
  { user, resourceId, objectKey, originalFileName }: RegisterUploadedResourceAssetInput,
  dependencies: UploadDependencies = {},
): Promise<UploadResourceAssetResult> {
  if (!user.id) {
    return { ok: false, code: "UNAUTHENTICATED", message: "You need to sign in before uploading a resource." };
  }
  if (!user.roles.includes("ADMIN") && !user.roles.includes("TEACHER")) {
    return { ok: false, code: "FORBIDDEN", message: "Only teachers and admins can upload resources." };
  }
  if (!isPendingUploadOwnedBy(objectKey, user.id)) {
    return { ok: false, code: "INVALID_UPLOAD", message: "The upload could not be verified. Please try again." };
  }

  const runtimePrismaClient = dependencies.prismaClient ?? (await import("@/lib/prisma").then((mod) => mod.default));
  const prismaClient = runtimePrismaClient as NonNullable<typeof dependencies.prismaClient>;

  try {
    const storage = dependencies.storageProvider ?? createResourceStorageProvider();
    if (!supportsPresignedTransfer(storage)) {
      return { ok: false, code: "UNSUPPORTED_PROVIDER", message: "Direct uploads are not available." };
    }

    const resource = await prismaClient.resource.findUnique({
      where: { id: resourceId },
      select: { ...RESOURCE_UPLOAD_SELECT },
    });
    const authorization = authorizeResourceUpload(user, resource);
    if (!authorization.ok) return authorization;

    const head = await storage.headObject(objectKey);
    if (!head || head.sizeBytes <= 0) {
      return { ok: false, code: "UPLOAD_NOT_FOUND", message: "The uploaded file could not be found. Please try again." };
    }

    const maxMb = parseMaxMb(String(dependencies.uploadMaxMb ?? getStorageEnvironment().uploadMaxMb));
    if (head.sizeBytes > maxMb * 1024 * 1024) {
      return { ok: false, code: "FILE_TOO_LARGE", message: `File exceeds the ${maxMb}MB upload limit.` };
    }
    if (head.contentType && !["application/pdf", "application/x-pdf"].includes(head.contentType.toLowerCase())) {
      return { ok: false, code: "INVALID_MIME", message: "The file type is not a valid PDF." };
    }

    const prefix = await storage.readObjectPrefix(objectKey, PDF_MAGIC_BYTES.length);
    if (!prefix.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES)) {
      return { ok: false, code: "INVALID_SIGNATURE", message: "The uploaded file is not a valid PDF." };
    }

    const finalObjectKey = buildResourceAssetObjectKey(resourceId);
    const asset = await prismaClient.resourceAsset.create({
      data: {
        resourceId,
        provider: storage.providerName,
        objectKey: finalObjectKey,
        originalFileName: sanitizeFileName(originalFileName),
        mimeType: PDF_CONTENT_TYPE,
        sizeBytes: BigInt(head.sizeBytes),
        // The file is never read into the application, so no digest is computed.
        // Duplicate-checksum reporting already tolerates a null.
        checksum: null,
        status: "UPLOADING",
        assetVersion: (authorization.resource.assets?.[0]?.assetVersion ?? 0) + 1,
        isPrimary: true,
      },
    });

    try {
      await storage.copyObject(objectKey, finalObjectKey);
      await activateStoredAsset(prismaClient, {
        assetId: asset.id,
        resourceId,
        objectKey: finalObjectKey,
        provider: storage.providerName,
        mimeType: PDF_CONTENT_TYPE,
        sizeBytes: head.sizeBytes,
        checksum: null,
      });
      // Best effort: the staging prefix expiry rule removes it regardless.
      await storage.delete(objectKey).catch(() => undefined);

      return { ok: true, assetId: asset.id, objectKey: finalObjectKey, readUrl: "" };
    } catch {
      await prismaClient.resourceAsset.delete({ where: { id: asset.id } }).catch(() => undefined);
      await storage.delete(finalObjectKey).catch(() => undefined);
      return { ok: false, code: "UPLOAD_FAILED", message: "The file could not be stored. Please try again." };
    }
  } catch {
    return { ok: false, code: "UPLOAD_FAILED", message: "The file could not be stored. Please try again." };
  }
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
      select: { ...RESOURCE_UPLOAD_SELECT },
    });

    const authorization = authorizeResourceUpload(user, resource);
    if (!authorization.ok) return authorization;

    const buffer = await readFileBuffer(file);
    const uploadMaxMb = dependencies.uploadMaxMb ?? getStorageEnvironment().uploadMaxMb;
    const validation = validatePdfUpload(file, buffer, String(uploadMaxMb));
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
        assetVersion: (authorization.resource.assets?.[0]?.assetVersion ?? 0) + 1,
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

      await activateStoredAsset(prismaClient, {
        assetId: asset.id,
        resourceId,
        objectKey: storageResult.objectKey,
        provider: storageResult.provider,
        mimeType: storageResult.mimeType,
        sizeBytes: storageResult.sizeBytes,
        checksum: storageResult.checksum,
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
