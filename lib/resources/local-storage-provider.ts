import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

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
    await rm(join(this.rootPath, objectKey), { force: true });
  }

  async getReadUrl(objectKey: string): Promise<string> {
    return `/api/resources/${objectKey}`;
  }
}
