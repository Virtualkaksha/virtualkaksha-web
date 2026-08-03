import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import "./helpers/server-only";

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { LocalResourceStorageProvider } from "@/lib/resources/local-storage-provider";
import { S3ResourceStorageProvider } from "@/lib/resources/s3-storage-provider";
import { createResourceStorageProvider } from "@/lib/resources/storage-provider-factory";

const s3Config = {
  endpoint: "https://storage.example.test/",
  region: "auto",
  bucket: "private-resources",
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret-key",
  forcePathStyle: false,
};

test("local provider remains available in development and can round-trip a PDF", async () => {
  const root = await mkdtemp(join(tmpdir(), "virtualkaksha-storage-"));
  try {
    const provider = createResourceStorageProvider("local", {
      NODE_ENV: "development",
      LOCAL_RESOURCE_STORAGE_PATH: root,
      RESOURCE_UPLOAD_MAX_MB: "20",
    });
    assert.ok(provider instanceof LocalResourceStorageProvider);

    const diskProvider = new LocalResourceStorageProvider(root);
    const buffer = Buffer.from("%PDF-local");
    await diskProvider.upload({
      objectKey: "resources/resource-1/local.pdf",
      originalFileName: "local.pdf",
      mimeType: "application/pdf",
      sizeBytes: buffer.length,
      buffer,
    });
    assert.deepEqual(await diskProvider.readFile("resources/resource-1/local.pdf"), buffer);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("production rejects missing and local storage providers", () => {
  assert.throws(() => createResourceStorageProvider(undefined, { NODE_ENV: "production" }), /RESOURCE_STORAGE_PROVIDER is required/);
  assert.throws(() => createResourceStorageProvider("local", { NODE_ENV: "production" }), /must be s3 in production/);
});

test("unsupported providers and incomplete S3 configuration fail closed", () => {
  assert.throws(() => createResourceStorageProvider("public-url", { NODE_ENV: "development" }), /must be local or s3/);
  assert.throws(() => createResourceStorageProvider("s3", { NODE_ENV: "production" }), /S3_ENDPOINT/);
  assert.throws(() => createResourceStorageProvider("s3", {
    NODE_ENV: "production",
    S3_ENDPOINT: "http://storage.example.test",
    S3_REGION: "auto",
    S3_BUCKET: "private",
    S3_ACCESS_KEY_ID: "key",
    S3_SECRET_ACCESS_KEY: "secret",
    S3_FORCE_PATH_STYLE: "false",
  }), /must use HTTPS/);
});

test("S3 upload targets the configured private bucket with a PDF content type", async () => {
  const commands: unknown[] = [];
  const provider = new S3ResourceStorageProvider(s3Config, { send: async (command) => { commands.push(command); return {}; } });
  const buffer = Buffer.from("%PDF-s3");
  const result = await provider.upload({ objectKey: "resources/resource-1/random.pdf", originalFileName: "lesson.pdf", mimeType: "application/pdf", sizeBytes: buffer.length, buffer });

  assert.equal(commands.length, 1);
  assert.ok(commands[0] instanceof PutObjectCommand);
  assert.deepEqual((commands[0] as PutObjectCommand).input, {
    Bucket: "private-resources",
    Key: "resources/resource-1/random.pdf",
    Body: buffer,
    ContentType: "application/pdf",
    ContentLength: buffer.length,
  });
  assert.equal("ACL" in (commands[0] as PutObjectCommand).input, false);
  assert.equal(result.provider, "s3");
  assert.equal(result.readUrl, "");
});

test("S3 protected read retrieves bytes without producing a public URL", async () => {
  const commands: unknown[] = [];
  const bytes = Buffer.from("%PDF-private");
  const provider = new S3ResourceStorageProvider(s3Config, {
    send: async (command) => {
      commands.push(command);
      return { Body: { transformToByteArray: async () => new Uint8Array(bytes) } };
    },
  });
  assert.deepEqual(await provider.readFile("resources/resource-1/random.pdf"), bytes);
  assert.ok(commands[0] instanceof GetObjectCommand);
  assert.equal(await provider.getReadUrl("resources/resource-1/random.pdf"), "");
});

test("malicious storage keys fail before an S3 command is sent", async () => {
  let calls = 0;
  const provider = new S3ResourceStorageProvider(s3Config, { send: async () => { calls += 1; return {}; } });
  await assert.rejects(provider.readFile("../private.pdf"), /Invalid object key/);
  await assert.rejects(provider.readFile("resources\\private.pdf"), /Invalid object key/);
  assert.equal(calls, 0);
});

test("client components import neither AWS SDK nor server storage configuration", async () => {
  for (const file of [
    "app/teacher/resources/ResourceCreateForm.tsx",
    "components/student/StudentPdfViewer.tsx",
    "components/student/StudentPdfCanvasViewer.tsx",
    "components/student/BookmarkButton.tsx",
  ]) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /@aws-sdk|storage-provider-factory|S3_SECRET|S3_ACCESS/);
  }
});
