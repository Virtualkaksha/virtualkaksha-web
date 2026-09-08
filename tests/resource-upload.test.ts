import test from "node:test";
import assert from "node:assert/strict";

import "./helpers/server-only";

import { validatePdfUpload, uploadResourceAsset, registerUploadedResourceAsset } from "@/lib/resources/upload-service";
import type { PresignCapableStorageProvider, ResourceStorageProvider, ResourceStorageUploadInput, ResourceStorageUploadResult } from "@/lib/resources/storage";

type TestFile = {
  name: string;
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

const createBufferFile = (name: string, type: string, bytes: Buffer): TestFile => ({
  name,
  type,
  arrayBuffer: async () => Uint8Array.from(bytes).buffer,
});

class InMemoryStorage implements ResourceStorageProvider {
  readonly providerName = "memory";
  uploaded: Array<{ objectKey: string; buffer: Buffer }> = [];

  async upload(input: { objectKey: string; buffer: Buffer }) {
    this.uploaded.push({ objectKey: input.objectKey, buffer: input.buffer });
    return { provider: this.providerName, objectKey: input.objectKey, mimeType: "application/pdf", sizeBytes: input.buffer.length, checksum: "abc", readUrl: `/files/${input.objectKey}` };
  }

  async delete(objectKey: string) {
    this.uploaded = this.uploaded.filter((item) => item.objectKey !== objectKey);
  }

  async getReadUrl(objectKey: string) {
    return `/files/${objectKey}`;
  }

  async readFile(objectKey: string) {
    const uploaded = this.uploaded.find((item) => item.objectKey === objectKey);
    if (!uploaded) {
      throw new Error("missing");
    }
    return uploaded.buffer;
  }
}

test("unauthenticated upload is rejected", async () => {
  const result = await uploadResourceAsset({ user: { id: "", roles: [] }, resourceId: "res-1", file: createBufferFile("test.pdf", "application/pdf", Buffer.from("%PDF-1")) });
  assert.equal(result.ok, false);
  assert.equal(result.code, "UNAUTHENTICATED");
});

test("student upload is rejected", async () => {
  const prismaClient = {
    resource: {
      findUnique: async () => ({ id: "res-1", format: "PDF", createdByUserId: "teacher-1", teachers: [] }),
      update: async () => undefined,
    },
    resourceAsset: { create: async () => ({ id: "asset-1" }), update: async () => undefined, delete: async () => undefined },
  };

  const result = await uploadResourceAsset({ user: { id: "student-1", roles: ["STUDENT"] }, resourceId: "res-1", file: createBufferFile("test.pdf", "application/pdf", Buffer.from("%PDF-1")) }, { prismaClient });
  assert.equal(result.ok, false);
  assert.equal(result.code, "FORBIDDEN");
});

test("invalid extension is rejected", async () => {
  const result = validatePdfUpload(createBufferFile("test.txt", "application/pdf", Buffer.from("%PDF-1")), Buffer.from("%PDF-1"));
  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_EXTENSION");
});

test("invalid PDF signature is rejected", async () => {
  const result = validatePdfUpload(createBufferFile("test.pdf", "application/pdf", Buffer.from("NOT A PDF")), Buffer.from("NOT A PDF"));
  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_SIGNATURE");
});

test("oversized file is rejected", async () => {
  const hugeBuffer = Buffer.alloc(3 * 1024 * 1024, 1);
  hugeBuffer[0] = 0x25; hugeBuffer[1] = 0x50; hugeBuffer[2] = 0x44; hugeBuffer[3] = 0x46;
  const result = validatePdfUpload(createBufferFile("test.pdf", "application/pdf", hugeBuffer), hugeBuffer, "1");
  assert.equal(result.ok, false);
  assert.equal(result.code, "FILE_TOO_LARGE");
});

test("successful upload creates a READY asset", async () => {
  const storage = new InMemoryStorage();
  const createdAssets: Array<Record<string, unknown>> = [];
  const resourceUpdates: Array<Record<string, unknown>> = [];
  const prismaClient = {
    resource: {
      findUnique: async () => ({ id: "res-1", format: "PDF", createdByUserId: "teacher-1", teachers: [] }),
      update: async (input: { data: Record<string, unknown> }) => {
        resourceUpdates.push(input.data);
        return undefined;
      },
    },
    resourceAsset: {
      create: async (input: { data: Record<string, unknown> }) => {
        createdAssets.push(input.data);
        return { id: "asset-1", ...input.data };
      },
      update: async (input: { data: Record<string, unknown> }) => {
        createdAssets[0] = { ...createdAssets[0], ...input.data };
        return undefined;
      },
      delete: async () => undefined,
    },
  };
  const result = await uploadResourceAsset({ user: { id: "teacher-1", roles: ["TEACHER"] }, resourceId: "res-1", file: createBufferFile("test.pdf", "application/pdf", Buffer.from("%PDF-1")) }, { prismaClient, storageProvider: storage, uploadMaxMb: 20 });
  assert.equal(result.ok, true);
  assert.equal(storage.uploaded.length, 1);
  assert.equal(createdAssets[0].status, "READY");
  assert.equal(createdAssets[0].mimeType, "application/pdf");
  assert.equal(resourceUpdates[0].contentUrl, null);
  assert.equal(resourceUpdates[0].fileSizeBytes, BigInt(6));
  assert.equal(resourceUpdates[0].activeAssetId, "asset-1");
  assert.equal(createdAssets[0].assetVersion, 1);
});

test("generic upload blocks a second active PDF pending the replacement workflow", async () => {
  const storage = new InMemoryStorage();
  const prismaClient = {
    resource: { findUnique: async () => ({ id: "res-1", format: "PDF", createdByUserId: "teacher-1", teachers: [], activeAssetId: "asset-current", assets: [{ assetVersion: 1 }] }), update: async () => undefined },
    resourceAsset: { create: async () => { throw new Error("must not create"); }, update: async () => undefined, delete: async () => undefined },
  };
  const result = await uploadResourceAsset({ user: { id: "teacher-1", roles: ["TEACHER"] }, resourceId: "res-1", file: createBufferFile("test.pdf", "application/pdf", Buffer.from("%PDF-1")) }, { prismaClient, storageProvider: storage, uploadMaxMb: 20 });
  assert.deepEqual(result, { ok: false, code: "REPLACEMENT_REQUIRED", message: "This resource already has an active PDF. Use the replacement workflow." });
  assert.equal(storage.uploaded.length, 0);
});

test("failed upload does not leave a READY database record", async () => {
  const prismaClient = {
    resource: {
      findUnique: async () => ({ id: "res-1", format: "PDF", createdByUserId: "teacher-1", teachers: [] }),
      update: async () => undefined,
    },
    resourceAsset: {
      create: async () => ({ id: "asset-1" }),
      update: async () => undefined,
      delete: async () => undefined,
    },
  };
  const result = await uploadResourceAsset({ user: { id: "teacher-1", roles: ["TEACHER"] }, resourceId: "res-1", file: createBufferFile("test.pdf", "application/pdf", Buffer.from("%PDF-1")) }, { prismaClient, storageProvider: { providerName: "broken", upload: async () => { throw new Error("boom"); }, delete: async () => undefined, getReadUrl: async () => "", readFile: async () => { throw new Error("missing"); } }, uploadMaxMb: 20 });
  assert.equal(result.ok, false);
  assert.equal(result.code, "UPLOAD_FAILED");
});

test("teacher cannot upload to another teacher's resource", async () => {
  const prismaClient = {
    resource: {
      findUnique: async () => ({ id: "res-1", format: "PDF", createdByUserId: "teacher-2", teachers: [] }),
      update: async () => undefined,
    },
    resourceAsset: { create: async () => ({ id: "asset-1" }), update: async () => undefined, delete: async () => undefined },
  };
  const result = await uploadResourceAsset({ user: { id: "teacher-1", roles: ["TEACHER"] }, resourceId: "res-1", file: createBufferFile("test.pdf", "application/pdf", Buffer.from("%PDF-1")) }, { prismaClient, storageProvider: new InMemoryStorage(), uploadMaxMb: 20 });
  assert.equal(result.ok, false);
  assert.equal(result.code, "FORBIDDEN");
});

test("admin can upload when authorized", async () => {
  const storage = new InMemoryStorage();
  const prismaClient = {
    resource: {
      findUnique: async () => ({ id: "res-1", format: "PDF", createdByUserId: "teacher-2", teachers: [] }),
      update: async () => undefined,
    },
    resourceAsset: {
      create: async () => ({ id: "asset-1" }),
      update: async () => undefined,
      delete: async () => undefined,
    },
  };
  const result = await uploadResourceAsset({ user: { id: "admin-1", roles: ["ADMIN"] }, resourceId: "res-1", file: createBufferFile("test.pdf", "application/pdf", Buffer.from("%PDF-1")) }, { prismaClient, storageProvider: storage, uploadMaxMb: 20 });
  assert.equal(result.ok, true);
  assert.equal(storage.uploaded.length, 1);
});

class DirectUploadStorage implements PresignCapableStorageProvider {
  readonly providerName = "s3";
  objects = new Map<string, { buffer: Buffer; contentType: string }>();

  async upload(_input: ResourceStorageUploadInput): Promise<ResourceStorageUploadResult> {
    throw new Error("buffered upload must not run");
  }
  async delete(objectKey: string) {
    this.objects.delete(objectKey);
  }
  async getReadUrl() {
    return "";
  }
  async readFile(objectKey: string) {
    const stored = this.objects.get(objectKey);
    if (!stored) throw new Error("missing");
    return stored.buffer;
  }
  async createUploadUrl({ objectKey }: { objectKey: string }) {
    return { url: "https://storage.test/put", objectKey, expiresInSeconds: 60, requiredContentType: "application/pdf" };
  }
  async createReadUrl() {
    return "";
  }
  async headObject(objectKey: string) {
    const stored = this.objects.get(objectKey);
    if (!stored) return null;
    return { sizeBytes: stored.buffer.length, contentType: stored.contentType, entityTag: null };
  }
  async readObjectPrefix(objectKey: string, byteLength: number) {
    const stored = this.objects.get(objectKey);
    if (!stored) throw new Error("missing");
    return stored.buffer.subarray(0, byteLength);
  }
  async copyObject(sourceObjectKey: string, destinationObjectKey: string) {
    const stored = this.objects.get(sourceObjectKey);
    if (!stored) throw new Error("missing");
    this.objects.set(destinationObjectKey, { ...stored });
  }
}

const OWNED_STAGING_KEY = "uploads/teacher-1/550e8400-e29b-41d4-a716-446655440000.pdf";

function registerPrisma() {
  const createdAssets: Array<Record<string, unknown>> = [];
  return {
    createdAssets,
    prismaClient: {
      resource: {
        findUnique: async () => ({ id: "res-1", format: "PDF", createdByUserId: "teacher-1", teachers: [] }),
        update: async () => undefined,
        updateMany: async () => ({ count: 1 }),
      },
      resourceAsset: {
        create: async (input: { data: Record<string, unknown> }) => {
          createdAssets.push(input.data);
          return { id: "asset-1", ...input.data };
        },
        update: async (input: { data: Record<string, unknown> }) => {
          createdAssets[0] = { ...createdAssets[0], ...input.data };
          return undefined;
        },
        delete: async () => undefined,
      },
    },
  };
}

test("direct upload inspects storage and activates a READY asset without reading the whole file", async () => {
  const storage = new DirectUploadStorage();
  storage.objects.set(OWNED_STAGING_KEY, { buffer: Buffer.from("%PDF-1.4"), contentType: "application/pdf" });
  const { prismaClient, createdAssets } = registerPrisma();

  const result = await registerUploadedResourceAsset({
    user: { id: "teacher-1", roles: ["TEACHER"] },
    resourceId: "res-1",
    objectKey: OWNED_STAGING_KEY,
    originalFileName: "lesson.pdf",
  }, { prismaClient, storageProvider: storage, uploadMaxMb: 20 });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.objectKey, /^resources\/res-1\/[0-9a-f-]{36}\.pdf$/);
  assert.equal(storage.objects.has(OWNED_STAGING_KEY), false);
  assert.equal(storage.objects.has(result.objectKey), true);
  assert.equal(createdAssets[0].status, "READY");
  assert.equal(createdAssets[0].checksum, null);
});

test("direct upload rejects a staging key that does not name the caller", async () => {
  const storage = new DirectUploadStorage();
  storage.objects.set("uploads/teacher-2/550e8400-e29b-41d4-a716-446655440000.pdf", {
    buffer: Buffer.from("%PDF-1.4"),
    contentType: "application/pdf",
  });
  const { prismaClient } = registerPrisma();
  const result = await registerUploadedResourceAsset({
    user: { id: "teacher-1", roles: ["TEACHER"] },
    resourceId: "res-1",
    objectKey: "uploads/teacher-2/550e8400-e29b-41d4-a716-446655440000.pdf",
    originalFileName: "lesson.pdf",
  }, { prismaClient, storageProvider: storage, uploadMaxMb: 20 });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "INVALID_UPLOAD");
  assert.equal(storage.objects.size, 1);
});

test("direct upload rejects a stored object that is not a PDF", async () => {
  const storage = new DirectUploadStorage();
  storage.objects.set(OWNED_STAGING_KEY, { buffer: Buffer.from("not-a-pdf"), contentType: "application/pdf" });
  const { prismaClient } = registerPrisma();
  const result = await registerUploadedResourceAsset({
    user: { id: "teacher-1", roles: ["TEACHER"] },
    resourceId: "res-1",
    objectKey: OWNED_STAGING_KEY,
    originalFileName: "lesson.pdf",
  }, { prismaClient, storageProvider: storage, uploadMaxMb: 20 });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "INVALID_SIGNATURE");
});
