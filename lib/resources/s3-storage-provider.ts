import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import {
  computeChecksum,
  validateStorageObjectKey,
  type ResourceStorageProvider,
  type ResourceStorageUploadInput,
  type ResourceStorageUploadResult,
} from "./storage";

export type S3StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

type S3CommandClient = {
  send(command: unknown): Promise<unknown>;
};

async function bodyToBuffer(body: unknown) {
  if (!body || typeof body !== "object") throw new Error("Stored object has no body.");
  if ("transformToByteArray" in body && typeof body.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray());
  }
  if (Symbol.asyncIterator in body) {
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }
  throw new Error("Stored object body cannot be read.");
}

export class S3ResourceStorageProvider implements ResourceStorageProvider {
  readonly providerName = "s3";
  private readonly client: S3CommandClient;

  constructor(
    private readonly config: S3StorageConfig,
    client?: S3CommandClient,
  ) {
    this.client = client ?? (new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }) as unknown as S3CommandClient);
  }

  async upload(input: ResourceStorageUploadInput): Promise<ResourceStorageUploadResult> {
    const objectKey = validateStorageObjectKey(input.objectKey);
    await this.client.send(new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: objectKey,
      Body: input.buffer,
      ContentType: "application/pdf",
      ContentLength: input.sizeBytes,
    }));

    return {
      provider: this.providerName,
      objectKey,
      mimeType: "application/pdf",
      sizeBytes: input.sizeBytes,
      checksum: computeChecksum(input.buffer),
      readUrl: "",
    };
  }

  async delete(objectKey: string) {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: validateStorageObjectKey(objectKey),
    }));
  }

  async getReadUrl(objectKey: string) {
    validateStorageObjectKey(objectKey);
    return "";
  }

  async readFile(objectKey: string) {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: validateStorageObjectKey(objectKey),
    })) as { Body?: unknown };
    return bodyToBuffer(response.Body);
  }
}
