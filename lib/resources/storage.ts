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
