import { LocalResourceStorageProvider } from "./local-storage-provider";
import { S3ResourceStorageProvider, type S3StorageConfig } from "./s3-storage-provider";
import {
  isSupportedResourceStorageProviderName,
  type ResourceStorageProvider,
} from "./storage";

type StorageEnvironment = {
  NODE_ENV?: string;
  RESOURCE_STORAGE_PROVIDER?: string;
  S3_ENDPOINT?: string;
  S3_REGION?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_FORCE_PATH_STYLE?: string;
};

function required(environment: StorageEnvironment, name: keyof StorageEnvironment) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`Resource storage configuration is missing ${name}.`);
  return value;
}

function parseBoolean(value: string, name: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be either true or false.`);
}

export function readS3StorageConfig(environment: StorageEnvironment): S3StorageConfig {
  const endpoint = required(environment, "S3_ENDPOINT");
  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    throw new Error("S3_ENDPOINT must be a valid HTTP(S) URL.");
  }
  if (!['http:', 'https:'].includes(endpointUrl.protocol)) {
    throw new Error("S3_ENDPOINT must be a valid HTTP(S) URL.");
  }
  if (environment.NODE_ENV === "production" && endpointUrl.protocol !== "https:") {
    throw new Error("S3_ENDPOINT must use HTTPS in production.");
  }

  return {
    endpoint: endpointUrl.toString(),
    region: required(environment, "S3_REGION"),
    bucket: required(environment, "S3_BUCKET"),
    accessKeyId: required(environment, "S3_ACCESS_KEY_ID"),
    secretAccessKey: required(environment, "S3_SECRET_ACCESS_KEY"),
    forcePathStyle: parseBoolean(required(environment, "S3_FORCE_PATH_STYLE"), "S3_FORCE_PATH_STYLE"),
  };
}

export function createResourceStorageProvider(
  providerOverride?: string,
  environment: StorageEnvironment = process.env,
): ResourceStorageProvider {
  const configuredProvider = providerOverride?.trim() || environment.RESOURCE_STORAGE_PROVIDER?.trim();
  if (!configuredProvider) {
    if (environment.NODE_ENV === "production") {
      throw new Error("RESOURCE_STORAGE_PROVIDER is required in production.");
    }
    return new LocalResourceStorageProvider();
  }
  if (!isSupportedResourceStorageProviderName(configuredProvider)) {
    throw new Error(`Unsupported resource storage provider: ${configuredProvider}.`);
  }
  if (configuredProvider === "local") {
    if (environment.NODE_ENV === "production") {
      throw new Error("Local resource storage is not allowed in production.");
    }
    return new LocalResourceStorageProvider();
  }
  return new S3ResourceStorageProvider(readS3StorageConfig(environment));
}
