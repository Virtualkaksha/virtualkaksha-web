import "server-only";

import {
  getStorageEnvironment,
  type EnvironmentSource,
  type StorageEnvironment,
} from "@/lib/env";

import { LocalResourceStorageProvider } from "./local-storage-provider";
import { S3ResourceStorageProvider, type S3StorageConfig } from "./s3-storage-provider";
import type { ResourceStorageProvider } from "./storage";

function withProviderOverride(
  environment: EnvironmentSource,
  providerOverride?: string,
): EnvironmentSource {
  return providerOverride
    ? { ...environment, RESOURCE_STORAGE_PROVIDER: providerOverride }
    : environment;
}

export function toS3StorageConfig(environment: Extract<StorageEnvironment, { provider: "s3" }>): S3StorageConfig {
  return {
    endpoint: environment.endpoint,
    region: environment.region,
    bucket: environment.bucket,
    accessKeyId: environment.accessKeyId,
    secretAccessKey: environment.secretAccessKey,
    forcePathStyle: environment.forcePathStyle,
  };
}

export function readS3StorageConfig(environment: EnvironmentSource): S3StorageConfig {
  const validated = getStorageEnvironment(withProviderOverride(environment, "s3"));
  if (validated.provider !== "s3") throw new Error("Storage environment validation failed: S3 provider is required.");
  return toS3StorageConfig(validated);
}

export function createResourceStorageProvider(
  providerOverride?: string,
  environment?: EnvironmentSource,
): ResourceStorageProvider {
  const validated = environment
    ? getStorageEnvironment(withProviderOverride(environment, providerOverride))
    : getStorageEnvironment();
  if (providerOverride && providerOverride !== validated.provider) {
    throw new Error("Storage environment validation failed: requested provider does not match configured provider.");
  }
  if (validated.provider === "local") {
    return new LocalResourceStorageProvider(validated.localPath);
  }
  return new S3ResourceStorageProvider(toS3StorageConfig(validated));
}
