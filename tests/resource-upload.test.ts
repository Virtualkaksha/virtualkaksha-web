import test from "node:test";
import assert from "node:assert/strict";

import { validatePdfUpload, uploadResourceAsset } from "@/lib/resources/upload-service";
import type { ResourceStorageProvider } from "@/lib/resources/storage";

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
  const prismaClient = {
    resource: {
      findUnique: async () => ({ id: "res-1", format: "PDF", createdByUserId: "teacher-1", teachers: [] }),
      update: async () => undefined,
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
  const result = await uploadResourceAsset({ user: { id: "teacher-1", roles: ["TEACHER"] }, resourceId: "res-1", file: createBufferFile("test.pdf", "application/pdf", Buffer.from("%PDF-1")) }, { prismaClient, storageProvider: storage });
  assert.equal(result.ok, true);
  assert.equal(storage.uploaded.length, 1);
  assert.equal(createdAssets[0].status, "READY");
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
  const result = await uploadResourceAsset({ user: { id: "teacher-1", roles: ["TEACHER"] }, resourceId: "res-1", file: createBufferFile("test.pdf", "application/pdf", Buffer.from("%PDF-1")) }, { prismaClient, storageProvider: { providerName: "broken", upload: async () => { throw new Error("boom"); }, delete: async () => undefined, getReadUrl: async () => "", readFile: async () => { throw new Error("missing"); } } });
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
  const result = await uploadResourceAsset({ user: { id: "teacher-1", roles: ["TEACHER"] }, resourceId: "res-1", file: createBufferFile("test.pdf", "application/pdf", Buffer.from("%PDF-1")) }, { prismaClient });
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
  const result = await uploadResourceAsset({ user: { id: "admin-1", roles: ["ADMIN"] }, resourceId: "res-1", file: createBufferFile("test.pdf", "application/pdf", Buffer.from("%PDF-1")) }, { prismaClient, storageProvider: storage });
  assert.equal(result.ok, true);
  assert.equal(storage.uploaded.length, 1);
});
