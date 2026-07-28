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
}

export function computeChecksum(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
