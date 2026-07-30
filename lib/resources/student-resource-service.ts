import { z } from "zod";

import {
  STUDENT_RESOURCE_ACCESS,
  STUDENT_READABLE_RESOURCE_WHERE,
} from "./resource-access-policy";
import { isSupportedResourceStorageProviderName } from "./storage";

export type StudentUser = {
  id: string;
  roles: string[];
};

export type ResourceViewerState =
  | {
      viewerType: "native";
      sourceUrl: string;
      assetId: string;
      contentType: "application/pdf";
      resourceId: string;
      isPdf: true;
    }
  | {
      viewerType: "external";
      sourceUrl: string;
      assetId: null;
      contentType: null;
      resourceId: string;
      isPdf: boolean;
    };

export type StudentResourceAssetAccessResult =
  | { ok: true; readUrl: string; contentType: "application/pdf"; assetId: string; resourceId: string }
  | {
      ok: false;
      code:
        | "UNAUTHENTICATED"
        | "FORBIDDEN"
        | "RESOURCE_UNAVAILABLE"
        | "ASSET_NOT_READY"
        | "INVALID_ASSET"
        | "UNSUPPORTED_PROVIDER";
      message: string;
    };

export type StudentResourceProgressReadResult =
  | { ok: true; progress: ProgressRecord }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN"; message: string };

export type StudentResourceProgressWriteResult =
  | { ok: true; progress: ProgressRecord }
  | {
      ok: false;
      code: "UNAUTHENTICATED" | "FORBIDDEN" | "RESOURCE_UNAVAILABLE" | "INVALID_PAGE" | "INVALID_PERCENT";
      message: string;
    };

type ResourceLike = {
  id: string;
  status: string;
  format: string;
  contentUrl?: string | null;
  externalUrl?: string | null;
  access: string;
  pageCount?: number | null;
};

type AssetLike = {
  id: string;
  status: string;
  isPrimary: boolean;
  provider?: string;
  mimeType?: string;
};

type ProgressPayload = {
  page?: number;
  percent?: number;
  completed?: boolean;
};

type ProgressRecord = {
  page: number | null;
  percent: number;
  completed: boolean;
};

type StoredProgressRecord = {
  lastPosition: number | null;
  progressPercent: number;
  status: string;
};

type ProgressResourceRecord = {
  id: string;
  status: string;
  format: string;
  access: string;
  pageCount: number | null;
};

type ProgressPrismaClient = {
  studentProfile: {
    findUnique: (args: { where: { userId: string }; select: { id: true } }) => Promise<{ id: string } | null>;
  };
  resource: {
    findFirst: (args: { where: Record<string, unknown>; select: Record<string, unknown> }) => Promise<ProgressResourceRecord | null>;
  };
  studentResourceProgress: {
    findUnique: (args: { where: Record<string, unknown>; select: Record<string, unknown> }) => Promise<StoredProgressRecord | null>;
    findFirst: (args: { where: Record<string, unknown>; select: Record<string, unknown> }) => Promise<StoredProgressRecord | null>;
    upsert: (args: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }) => Promise<StoredProgressRecord>;
  };
};

const pageSchema = z.number().int().positive().max(10000);
const percentSchema = z.number().int().min(0).max(100);
const PDF_MIME_TYPES = new Set(["application/pdf", "application/x-pdf"]);

function isStudent(user: StudentUser | null | undefined) {
  return Boolean(user?.id && user.roles.includes("STUDENT"));
}

function resourceAccessError(resource: Pick<ResourceLike, "status" | "format" | "access">) {
  if (resource.status !== "PUBLISHED" || resource.format !== "PDF") {
    return { ok: false as const, code: "RESOURCE_UNAVAILABLE" as const, message: "This PDF is not available yet." };
  }

  if (resource.access !== STUDENT_RESOURCE_ACCESS) {
    return { ok: false as const, code: "FORBIDDEN" as const, message: "You do not have access to this resource." };
  }

  return null;
}

function toProgress(record: StoredProgressRecord): ProgressRecord {
  return {
    page: record.lastPosition,
    percent: record.progressPercent,
    completed: record.status === "COMPLETED",
  };
}

function validHttpUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

export function resolveStudentResourceViewerState({ resource, asset }: { resource: ResourceLike; asset: AssetLike | null }): ResourceViewerState {
  if (resource.format === "PDF" && asset?.status === "READY" && asset.isPrimary) {
    return {
      viewerType: "native",
      sourceUrl: `/api/student/resources/${resource.id}/asset`,
      assetId: asset.id,
      contentType: "application/pdf",
      resourceId: resource.id,
      isPdf: true,
    };
  }

  if (resource.format === "PDF") {
    return {
      viewerType: "external",
      sourceUrl: validHttpUrl(resource.externalUrl) ?? "",
      assetId: null,
      contentType: null,
      resourceId: resource.id,
      isPdf: true,
    };
  }

  return {
    viewerType: "external",
    sourceUrl: validHttpUrl(resource.externalUrl) ?? validHttpUrl(resource.contentUrl) ?? "",
    assetId: null,
    contentType: null,
    resourceId: resource.id,
    isPdf: false,
  };
}

export function resolveStudentResourceDownloadUrl({ resource, asset }: { resource: ResourceLike; asset: AssetLike | null }) {
  return resolveStudentResourceViewerState({ resource, asset }).sourceUrl || null;
}

export function authorizeStudentResourceAssetAccess({
  user,
  resource,
  asset,
}: {
  user: StudentUser | null | undefined;
  resource: ResourceLike;
  asset: AssetLike | null;
}): StudentResourceAssetAccessResult {
  if (!user?.id) {
    return { ok: false, code: "UNAUTHENTICATED", message: "Please sign in to access this resource." };
  }
  if (!isStudent(user)) {
    return { ok: false, code: "FORBIDDEN", message: "Student access is required." };
  }

  const accessError = resourceAccessError(resource);
  if (accessError) return accessError;

  if (!asset || asset.status !== "READY" || !asset.isPrimary) {
    return { ok: false, code: "ASSET_NOT_READY", message: "This PDF is not ready to view yet." };
  }
  if (!asset.provider || !isSupportedResourceStorageProviderName(asset.provider)) {
    return { ok: false, code: "UNSUPPORTED_PROVIDER", message: "This PDF storage provider is not supported." };
  }
  if (!asset.mimeType || !PDF_MIME_TYPES.has(asset.mimeType.toLowerCase())) {
    return { ok: false, code: "INVALID_ASSET", message: "The stored file is not a valid PDF asset." };
  }

  return {
    ok: true,
    readUrl: `/api/student/resources/${resource.id}/asset`,
    contentType: "application/pdf",
    assetId: asset.id,
    resourceId: resource.id,
  };
}

export async function getStudentResourceProgress({
  user,
  prismaClient,
  resourceId,
}: {
  user: StudentUser | null | undefined;
  prismaClient?: ProgressPrismaClient;
  resourceId: string;
}): Promise<StudentResourceProgressReadResult> {
  if (!isStudent(user)) {
    return { ok: false, code: "FORBIDDEN", message: "Progress unavailable." };
  }
  const studentUser = user as StudentUser;

  const runtimePrisma = (prismaClient ?? (await import("@/lib/prisma").then((mod) => mod.default))) as ProgressPrismaClient;
  const studentProfile = await runtimePrisma.studentProfile.findUnique({ where: { userId: studentUser.id }, select: { id: true } });
  if (!studentProfile) return { ok: false, code: "NOT_FOUND", message: "Progress unavailable." };

  const resource = await runtimePrisma.resource.findFirst({
    where: { AND: [{ id: resourceId }, STUDENT_READABLE_RESOURCE_WHERE] },
    select: { id: true, status: true, format: true, access: true, pageCount: true },
  });
  if (!resource) return { ok: false, code: "FORBIDDEN", message: "Progress unavailable." };

  const progressRecord = await runtimePrisma.studentResourceProgress.findFirst({
    where: { studentProfileId: studentProfile.id, resourceId },
    select: { lastPosition: true, progressPercent: true, status: true },
  });
  if (!progressRecord) return { ok: false, code: "NOT_FOUND", message: "No progress found." };

  return { ok: true, progress: toProgress(progressRecord) };
}

export async function saveStudentResourceProgress({
  user,
  prismaClient,
  resourceId,
  payload,
}: {
  user: StudentUser | null | undefined;
  prismaClient?: ProgressPrismaClient;
  resourceId: string;
  payload: ProgressPayload;
}): Promise<StudentResourceProgressWriteResult> {
  if (!user?.id) {
    return { ok: false, code: "UNAUTHENTICATED", message: "Please sign in to save progress." };
  }
  if (!isStudent(user)) {
    return { ok: false, code: "FORBIDDEN", message: "Student access is required." };
  }
  if (payload.page !== undefined && !pageSchema.safeParse(payload.page).success) {
    return { ok: false, code: "INVALID_PAGE", message: "The page number is invalid." };
  }
  if (payload.percent !== undefined && !percentSchema.safeParse(payload.percent).success) {
    return { ok: false, code: "INVALID_PERCENT", message: "The progress percentage is invalid." };
  }

  const runtimePrisma = (prismaClient ?? (await import("@/lib/prisma").then((mod) => mod.default))) as ProgressPrismaClient;
  const resource = await runtimePrisma.resource.findFirst({
    where: { AND: [{ id: resourceId }, STUDENT_READABLE_RESOURCE_WHERE] },
    select: { id: true, status: true, format: true, access: true, pageCount: true },
  });
  if (!resource) {
    return { ok: false, code: "RESOURCE_UNAVAILABLE", message: "This PDF is not available yet." };
  }
  const accessError = resourceAccessError(resource);
  if (accessError) return accessError;

  const studentProfile = await runtimePrisma.studentProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!studentProfile) {
    return { ok: false, code: "FORBIDDEN", message: "A student profile is required." };
  }

  const progressKey = { studentProfileId_resourceId: { studentProfileId: studentProfile.id, resourceId } };
  const existing = await runtimePrisma.studentResourceProgress.findUnique({
    where: progressKey,
    select: { lastPosition: true, progressPercent: true, status: true },
  });
  const maximumPage = Math.max(1, Math.min(10000, resource.pageCount ?? 10000));
  const page = payload.page === undefined ? existing?.lastPosition ?? null : Math.min(payload.page, maximumPage);
  const derivedPercent = page && resource.pageCount ? Math.round((page / resource.pageCount) * 100) : undefined;
  const percent = payload.percent ?? derivedPercent ?? existing?.progressPercent ?? 0;
  const completed = payload.completed ?? percent >= 100;
  const now = new Date();
  const createData = {
    studentProfileId: studentProfile.id,
    resourceId,
    lastPosition: page,
    progressPercent: completed ? 100 : percent,
    status: completed ? "COMPLETED" : "IN_PROGRESS",
    completedAt: completed ? now : null,
    lastAccessedAt: now,
    startedAt: now,
  };
  const updateData: Record<string, unknown> = {
    lastAccessedAt: now,
    status: completed ? "COMPLETED" : "IN_PROGRESS",
    completedAt: completed ? now : null,
  };
  if (payload.page !== undefined) updateData.lastPosition = page;
  if (payload.percent !== undefined || derivedPercent !== undefined) updateData.progressPercent = completed ? 100 : percent;

  const progressRecord = await runtimePrisma.studentResourceProgress.upsert({
    where: progressKey,
    create: createData,
    update: updateData,
  });

  return { ok: true, progress: toProgress(progressRecord) };
}

export async function getCurrentUserIdentity(): Promise<StudentUser | null> {
  const { getCurrentSession } = await import("@/lib/auth/session");
  const session = await getCurrentSession();
  return session?.user?.id ? { id: session.user.id, roles: session.user.roles } : null;
}
