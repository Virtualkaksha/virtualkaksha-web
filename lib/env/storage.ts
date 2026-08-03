import "server-only";

import { z } from "zod";

import {
  environmentError,
  optionalValue,
  parseHttpUrl,
  parseRuntimeEnvironment,
  parseStrictBoolean,
  rejectPlaceholder,
  rejectPlaceholderUrl,
  requiredValue,
  type EnvironmentSource,
  type RuntimeEnvironment,
} from "./common";

type StorageBase = Readonly<{ nodeEnv: RuntimeEnvironment; uploadMaxMb: number }>;
export type StorageEnvironment =
  | (StorageBase & Readonly<{ provider: "local"; localPath: string }>)
  | (StorageBase & Readonly<{
      provider: "s3";
      endpoint: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      forcePathStyle: boolean;
    }>);

const uploadLimitSchema = z.coerce.number().int().min(1).max(20);
const providerSchema = z.enum(["local", "s3"]);
let storageEnvironmentCache = new WeakMap<object, StorageEnvironment>();

function checkedCredential(value: string, variable: string) {
  rejectPlaceholder(value, variable, "Storage");
  return value;
}

export function getStorageEnvironment(environment: EnvironmentSource = process.env): StorageEnvironment {
  const cacheKey = environment as object;
  const cached = storageEnvironmentCache.get(cacheKey);
  if (cached) return cached;
  const nodeEnv = parseRuntimeEnvironment(environment);
  const rawProvider = requiredValue(environment, "RESOURCE_STORAGE_PROVIDER", "Storage").toLowerCase();
  const providerResult = providerSchema.safeParse(rawProvider);
  if (!providerResult.success) {
    throw environmentError("Storage", "RESOURCE_STORAGE_PROVIDER", "must be local or s3.");
  }
  const provider = providerResult.data;
  if (nodeEnv === "production" && provider === "local") {
    throw environmentError("Storage", "RESOURCE_STORAGE_PROVIDER", "must be s3 in production.");
  }
  const rawUploadLimit = optionalValue(environment, "RESOURCE_UPLOAD_MAX_MB") ?? "20";
  const uploadLimitResult = uploadLimitSchema.safeParse(rawUploadLimit);
  if (!uploadLimitResult.success) {
    throw environmentError("Storage", "RESOURCE_UPLOAD_MAX_MB", "must be an integer between 1 and 20.");
  }
  const base = { nodeEnv, uploadMaxMb: uploadLimitResult.data } as const;

  if (provider === "local") {
    const result = Object.freeze({
      ...base,
      provider,
      localPath: requiredValue(environment, "LOCAL_RESOURCE_STORAGE_PATH", "Storage"),
    });
    storageEnvironmentCache.set(cacheKey, result);
    return result;
  }

  const endpointValue = requiredValue(environment, "S3_ENDPOINT", "Storage");
  const endpoint = parseHttpUrl(endpointValue, "S3_ENDPOINT", "Storage", {
    requireHttps: nodeEnv === "production",
  });
  rejectPlaceholderUrl(endpoint, "S3_ENDPOINT", "Storage");
  const region = requiredValue(environment, "S3_REGION", "Storage");
  const bucket = requiredValue(environment, "S3_BUCKET", "Storage");
  rejectPlaceholder(region, "S3_REGION", "Storage");
  rejectPlaceholder(bucket, "S3_BUCKET", "Storage");
  const result = Object.freeze({
    ...base,
    provider,
    endpoint: endpoint.toString(),
    region,
    bucket,
    accessKeyId: checkedCredential(requiredValue(environment, "S3_ACCESS_KEY_ID", "Storage"), "S3_ACCESS_KEY_ID"),
    secretAccessKey: checkedCredential(requiredValue(environment, "S3_SECRET_ACCESS_KEY", "Storage"), "S3_SECRET_ACCESS_KEY"),
    forcePathStyle: parseStrictBoolean(
      requiredValue(environment, "S3_FORCE_PATH_STYLE", "Storage"),
      "S3_FORCE_PATH_STYLE",
      "Storage",
    ),
  });
  storageEnvironmentCache.set(cacheKey, result);
  return result;
}

export function resetStorageEnvironmentCacheForTests() {
  storageEnvironmentCache = new WeakMap();
}
