import assert from "node:assert/strict";
import test from "node:test";

import "./helpers/server-only";

import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { LocalResourceStorageProvider } from "@/lib/resources/local-storage-provider";
import { S3ResourceStorageProvider } from "@/lib/resources/s3-storage-provider";
import { PRESIGNED_URL_TTL_SECONDS, supportsPresignedTransfer } from "@/lib/resources/storage";

const s3Config = {
  endpoint: "https://storage.example.test/",
  region: "auto",
  bucket: "private-resources",
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret-key",
  forcePathStyle: false,
};

function providerWithSigner() {
  const signed: Array<{ command: unknown; expiresIn: number }> = [];
  const provider = new S3ResourceStorageProvider(
    s3Config,
    { send: async () => ({}) },
    async (_client, command, options) => {
      signed.push({ command, expiresIn: options.expiresIn });
      return "https://storage.example.test/signed";
    },
  );
  return { provider, signed };
}

test("upload URLs are signed for PDF content and expire within the short window", async () => {
  const { provider, signed } = providerWithSigner();
  const result = await provider.createUploadUrl({ objectKey: "resources/resource-1/file.pdf" });

  assert.equal(result.url, "https://storage.example.test/signed");
  assert.equal(result.objectKey, "resources/resource-1/file.pdf");
  assert.equal(result.requiredContentType, "application/pdf");
  assert.equal(result.expiresInSeconds, PRESIGNED_URL_TTL_SECONDS);
  assert.ok(PRESIGNED_URL_TTL_SECONDS <= 60);

  assert.equal(signed.length, 1);
  assert.equal(signed[0].expiresIn, PRESIGNED_URL_TTL_SECONDS);
  assert.ok(signed[0].command instanceof PutObjectCommand);
  assert.deepEqual((signed[0].command as PutObjectCommand).input, {
    Bucket: "private-resources",
    Key: "resources/resource-1/file.pdf",
    ContentType: "application/pdf",
  });
});

test("read URLs are signed inline, short lived, and never cached by the provider", async () => {
  const { provider, signed } = providerWithSigner();
  const first = await provider.createReadUrl("resources/resource-1/file.pdf");
  const second = await provider.createReadUrl("resources/resource-1/file.pdf", 30);

  assert.equal(first, "https://storage.example.test/signed");
  assert.equal(second, "https://storage.example.test/signed");
  assert.equal(signed.length, 2, "each request must be signed again rather than reusing a URL");
  assert.equal(signed[0].expiresIn, PRESIGNED_URL_TTL_SECONDS);
  assert.equal(signed[1].expiresIn, 30);
  assert.ok(signed[1].command instanceof GetObjectCommand);
  assert.deepEqual((signed[1].command as GetObjectCommand).input, {
    Bucket: "private-resources",
    Key: "resources/resource-1/file.pdf",
    ResponseContentType: "application/pdf",
    ResponseContentDisposition: "inline",
  });
});

test("presigning rejects traversal keys before anything is signed", async () => {
  const { provider, signed } = providerWithSigner();
  await assert.rejects(provider.createUploadUrl({ objectKey: "../secret.pdf" }), /Invalid object key/);
  await assert.rejects(provider.createReadUrl("resources\\secret.pdf"), /Invalid object key/);
  await assert.rejects(provider.createUploadUrl({ objectKey: "" }), /Invalid object key/);
  assert.equal(signed.length, 0);
});

test("object head normalizes size, type and entity tag, and reports a missing object as null", async () => {
  const present = new S3ResourceStorageProvider(s3Config, {
    send: async (command) => {
      assert.ok(command instanceof HeadObjectCommand);
      return { ContentLength: 2048, ContentType: "application/pdf", ETag: '"abc123"' };
    },
  });
  assert.deepEqual(await present.headObject("resources/resource-1/file.pdf"), {
    sizeBytes: 2048,
    contentType: "application/pdf",
    entityTag: "abc123",
  });

  const missing = new S3ResourceStorageProvider(s3Config, {
    send: async () => { throw new Error("NotFound"); },
  });
  assert.equal(await missing.headObject("resources/resource-1/file.pdf"), null);
});

test("prefix reads request a bounded range so a large object is never fully downloaded", async () => {
  const commands: unknown[] = [];
  const provider = new S3ResourceStorageProvider(s3Config, {
    send: async (command) => {
      commands.push(command);
      return { Body: { transformToByteArray: async () => new Uint8Array(Buffer.from("%PDF-1.7")) } };
    },
  });

  assert.deepEqual(await provider.readObjectPrefix("resources/resource-1/file.pdf", 8), Buffer.from("%PDF-1.7"));
  assert.equal((commands[0] as GetObjectCommand).input.Range, "bytes=0-7");
  await assert.rejects(provider.readObjectPrefix("resources/resource-1/file.pdf", 0), /Invalid byte length/);
});

test("only the S3 provider advertises presigned transfer, so local development keeps buffering", () => {
  assert.equal(supportsPresignedTransfer(new S3ResourceStorageProvider(s3Config, { send: async () => ({}) })), true);
  assert.equal(supportsPresignedTransfer(new LocalResourceStorageProvider("./storage/resources")), false);
});
