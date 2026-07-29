import { mkdir, readFile as readFileFromDisk, rm, writeFile } from "node:fs/promises";
import { join, normalize, relative, resolve } from "node:path";

import type { ResourceStorageProvider, ResourceStorageUploadInput, ResourceStorageUploadResult } from "./storage";
import { computeChecksum } from "./storage";

function resolveDefaultRootPath() {
  const configuredPath = process.env.LOCAL_RESOURCE_STORAGE_PATH;
  if (configuredPath) {
    return configuredPath;
  }

  const currentDir = process.cwd();
  return join(currentDir, "storage", "resources");
}

function sanitizeObjectKey(objectKey: string) {
  const normalized = normalize(objectKey).replace(/^\\+/, "");
  if (!normalized || normalized.includes("..") || normalized.startsWith("/")) {
    throw new Error("Invalid object key.");
  }

  return normalized;
}

export class LocalResourceStorageProvider implements ResourceStorageProvider {
  readonly providerName = "local";

  constructor(private readonly rootPath = resolveDefaultRootPath()) {}

  async upload(input: ResourceStorageUploadInput): Promise<ResourceStorageUploadResult> {
    const targetDir = join(this.rootPath, input.objectKey.split("/").slice(0, -1).join("/"));
    await mkdir(targetDir, { recursive: true });

    const destinationPath = join(this.rootPath, input.objectKey);
    await writeFile(destinationPath, input.buffer, { encoding: "binary" });

    return {
      provider: this.providerName,
      objectKey: input.objectKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksum: computeChecksum(input.buffer),
      readUrl: `/api/resources/${input.objectKey}`,
    };
  }

  async delete(objectKey: string): Promise<void> {
    await rm(this.resolveStoragePath(objectKey), { force: true });
  }

  async getReadUrl(objectKey: string): Promise<string> {
    return `/api/resources/${objectKey}`;
  }

  async readFile(objectKey: string): Promise<Buffer> {
    const targetPath = this.resolveStoragePath(objectKey);
    return readFileFromDisk(targetPath);
  }

  private resolveStoragePath(objectKey: string) {
    const safeObjectKey = sanitizeObjectKey(objectKey);
    const rootPath = resolve(this.rootPath);
    const targetPath = resolve(rootPath, safeObjectKey);
    const relativePath = relative(rootPath, targetPath);

    if (relativePath.startsWith("..") || relativePath === ".." || relativePath.includes("..")) {
      throw new Error("Invalid object key.");
    }

    return targetPath;
  }
}
