import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  computeChecksum,
  validateStorageObjectKey,
  PDF_CONTENT_TYPE,
  PRESIGNED_URL_TTL_SECONDS,
  type PresignCapableStorageProvider,
  type PresignedUpload,
  type ResourceStorageUploadInput,
  type ResourceStorageUploadResult,
  type StoredObjectHead,
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

/** Test seam for URL signing; production uses the AWS presigner. */
export type S3UrlSigner = (
  client: unknown,
  command: unknown,
  options: { expiresIn: number },
) => Promise<string>;

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

export class S3ResourceStorageProvider implements PresignCapableStorageProvider {
  readonly providerName = "s3";
  private readonly client: S3CommandClient;
  private readonly sign: S3UrlSigner;

  constructor(
    private readonly config: S3StorageConfig,
    client?: S3CommandClient,
    signer?: S3UrlSigner,
  ) {
    this.sign = signer ?? (getSignedUrl as unknown as S3UrlSigner);
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

  async createUploadUrl(
    { objectKey, expiresInSeconds = PRESIGNED_URL_TTL_SECONDS }: {
      objectKey: string;
      expiresInSeconds?: number;
    },
  ): Promise<PresignedUpload> {
    const validatedKey = validateStorageObjectKey(objectKey);
    // Content type is signed so the browser cannot store the object as anything
    // else. Size is not signed; it is enforced against the stored object instead.
    const url = await this.sign(
      this.client,
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: validatedKey,
        ContentType: PDF_CONTENT_TYPE,
      }),
      { expiresIn: expiresInSeconds },
    );

    return {
      url,
      objectKey: validatedKey,
      expiresInSeconds,
      requiredContentType: PDF_CONTENT_TYPE,
    };
  }

  async createReadUrl(objectKey: string, expiresInSeconds = PRESIGNED_URL_TTL_SECONDS) {
    return this.sign(
      this.client,
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: validateStorageObjectKey(objectKey),
        ResponseContentType: PDF_CONTENT_TYPE,
        ResponseContentDisposition: "inline",
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  async headObject(objectKey: string): Promise<StoredObjectHead | null> {
    try {
      const response = await this.client.send(new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: validateStorageObjectKey(objectKey),
      })) as { ContentLength?: number; ContentType?: string; ETag?: string };

      return {
        sizeBytes: response.ContentLength ?? 0,
        contentType: response.ContentType ?? null,
        entityTag: response.ETag?.replaceAll('"', "") ?? null,
      };
    } catch {
      return null;
    }
  }

  async copyObject(sourceObjectKey: string, destinationObjectKey: string) {
    const source = validateStorageObjectKey(sourceObjectKey);
    const destination = validateStorageObjectKey(destinationObjectKey);
    await this.client.send(new CopyObjectCommand({
      Bucket: this.config.bucket,
      Key: destination,
      CopySource: `${this.config.bucket}/${source}`,
      ContentType: PDF_CONTENT_TYPE,
      MetadataDirective: "REPLACE",
    }));
  }

  async readObjectPrefix(objectKey: string, byteLength: number) {
    if (!Number.isSafeInteger(byteLength) || byteLength < 1) {
      throw new Error("Invalid byte length.");
    }
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: validateStorageObjectKey(objectKey),
      Range: `bytes=0-${byteLength - 1}`,
    })) as { Body?: unknown };
    return bodyToBuffer(response.Body);
  }
}
