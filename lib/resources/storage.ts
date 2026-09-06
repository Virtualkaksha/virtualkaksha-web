import { createHash } from "node:crypto";

export type ResourceStorageUploadInput = {
  objectKey: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
};

export type ResourceStorageUploadResult = {
  provider: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  readUrl: string;
};

export interface ResourceStorageProvider {
  readonly providerName: string;
  upload(input: ResourceStorageUploadInput): Promise<ResourceStorageUploadResult>;
  delete(objectKey: string): Promise<void>;
  getReadUrl(objectKey: string): Promise<string>;
  readFile(objectKey: string): Promise<Buffer>;
}

export const PDF_CONTENT_TYPE = "application/pdf";

/**
 * Presigned URLs are deliberately short lived: a leaked link stays usable only for
 * this window, and callers sign per request rather than caching a URL.
 */
export const PRESIGNED_URL_TTL_SECONDS = 60;

export type PresignedUpload = {
  url: string;
  objectKey: string;
  expiresInSeconds: number;
  /** The client must send exactly this Content-Type or the signature fails. */
  requiredContentType: string;
};

export type StoredObjectHead = {
  sizeBytes: number;
  contentType: string | null;
  entityTag: string | null;
};

/**
 * Providers that can hand a time-limited URL to the browser, so file bytes never
 * pass through the application. Required wherever a host caps request or response
 * bodies below the upload limit.
 */
export interface PresignCapableStorageProvider extends ResourceStorageProvider {
  createUploadUrl(input: { objectKey: string; expiresInSeconds?: number }): Promise<PresignedUpload>;
  createReadUrl(objectKey: string, expiresInSeconds?: number): Promise<string>;
  headObject(objectKey: string): Promise<StoredObjectHead | null>;
  readObjectPrefix(objectKey: string, byteLength: number): Promise<Buffer>;
}

export function supportsPresignedTransfer(
  provider: ResourceStorageProvider,
): provider is PresignCapableStorageProvider {
  const candidate = provider as PresignCapableStorageProvider;
  return typeof candidate.createUploadUrl === "function"
    && typeof candidate.createReadUrl === "function"
    && typeof candidate.headObject === "function"
    && typeof candidate.readObjectPrefix === "function";
}

export const RESOURCE_STORAGE_PROVIDER_NAMES = ["local", "s3"] as const;
export type ResourceStorageProviderName = (typeof RESOURCE_STORAGE_PROVIDER_NAMES)[number];

export function isSupportedResourceStorageProviderName(value: string): value is ResourceStorageProviderName {
  return RESOURCE_STORAGE_PROVIDER_NAMES.includes(value as ResourceStorageProviderName);
}

export function validateStorageObjectKey(objectKey: string) {
  if (
    !objectKey ||
    objectKey.startsWith("/") ||
    objectKey.includes("\\") ||
    objectKey.split("/").some((segment) => !segment || segment === "." || segment === "..") ||
    /[\u0000-\u001f\u007f]/.test(objectKey)
  ) {
    throw new Error("Invalid object key.");
  }
  return objectKey;
}

export function computeChecksum(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
