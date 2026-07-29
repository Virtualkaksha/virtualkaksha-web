import test from "node:test";
import assert from "node:assert/strict";

import { createTeacherResourceCore } from "@/app/teacher/resources/actions";

type MinimalPrisma = {
  teacherProfile: { findUnique: (args: { where: { userId: string }; select: Record<string, unknown> }) => Promise<{ id: string } | null> };
  chapter: { findFirst: (args: { where: { id: string; isActive: boolean }; select: Record<string, unknown> }) => Promise<{ id: string } | null> };
  resourceType: { findFirst: (args: { where: { id: string; isActive: boolean }; select: Record<string, unknown> }) => Promise<{ id: string } | null> };
  resource: {
    findFirst: (args: { where: { chapterId: string; slug: string }; select: { id: string } }) => Promise<null>;
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
    updateMany: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<unknown>;
    delete: (args: { where: { id: string } }) => Promise<unknown>;
  };
};

function makePrisma(createdResourceId: string): MinimalPrisma {
  return {
    teacherProfile: {
      findUnique: async () => ({ id: "teacher-profile-1" }),
    },
    chapter: {
      findFirst: async () => ({ id: "chapter-1" }),
    },
    resourceType: {
      findFirst: async () => ({ id: "resource-type-1" }),
    },
    resource: {
      findFirst: async () => null,
      create: async () => ({ id: createdResourceId }),
      update: async () => undefined,
      updateMany: async () => undefined,
      delete: async () => undefined,
    },
  };
}

test("external URL flow still creates a resource", async () => {
  const createdRecords: Array<Record<string, unknown>> = [];
  const prismaClient = makePrisma("resource-external");
  prismaClient.resource.create = async ({ data }) => {
    createdRecords.push(data);
    return { id: "resource-external" };
  };
  const result = await createTeacherResourceCore({
    user: { id: "teacher-1", roles: ["TEACHER"] },
    formData: (() => {
      const formData = new FormData();
      formData.set("chapterId", "chapter-1");
      formData.set("resourceTypeId", "resource-type-1");
      formData.set("title", "External resource");
      formData.set("format", "PDF");
      formData.set("sourceType", "external-url");
      formData.set("externalUrl", "https://example.com/file.pdf");
      formData.set("status", "DRAFT");
      formData.set("language", "ENGLISH");
      formData.set("access", "FREE");
      return formData;
    })(),
    prismaClient: prismaClient as unknown as Parameters<typeof createTeacherResourceCore>[0]["prismaClient"],
    uploadHandler: async () => ({ ok: true, assetId: "asset-1", objectKey: "obj", readUrl: "/files/obj" }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.resourceId, "resource-external");
  assert.equal(createdRecords[0].contentUrl, null);
  assert.equal(createdRecords[0].externalUrl, "https://example.com/file.pdf");
});

test("PDF mode requires a PDF file", async () => {
  let createCalled = false;
  const prismaClient = makePrisma("resource-pdf-invalid");
  prismaClient.resource.create = async () => {
    createCalled = true;
    return { id: "resource-pdf-invalid" };
  };
  const result = await createTeacherResourceCore({
    user: { id: "teacher-1", roles: ["TEACHER"] },
    formData: (() => {
      const formData = new FormData();
      formData.set("chapterId", "chapter-1");
      formData.set("resourceTypeId", "resource-type-1");
      formData.set("title", "PDF resource");
      formData.set("format", "PDF");
      formData.set("sourceType", "native-pdf");
      formData.set("status", "DRAFT");
      formData.set("language", "ENGLISH");
      formData.set("access", "FREE");
      return formData;
    })(),
    prismaClient: prismaClient as unknown as Parameters<typeof createTeacherResourceCore>[0]["prismaClient"],
    uploadHandler: async () => ({ ok: true, assetId: "asset-1", objectKey: "obj", readUrl: "/files/obj" }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_FILE");
  assert.equal(createCalled, false);
});

test("valid native PDF is uploaded before moderation status is restored", async () => {
  const updates: Array<Record<string, unknown>> = [];
  const createdRecords: Array<Record<string, unknown>> = [];
  const prismaClient = makePrisma("resource-native");
  prismaClient.resource.create = async ({ data }) => {
    createdRecords.push(data);
    return { id: "resource-native" };
  };
  prismaClient.resource.update = async ({ data }) => {
    updates.push(data);
  };

  const formData = new FormData();
  formData.set("chapterId", "chapter-1");
  formData.set("resourceTypeId", "resource-type-1");
  formData.set("title", "Native PDF resource");
  formData.set("format", "PDF");
  formData.set("sourceType", "native-pdf");
  formData.set("status", "PENDING_REVIEW");
  formData.set("language", "ENGLISH");
  formData.set("access", "FREE");
  formData.set("file", new File(["%PDF-1"], "lesson.pdf", { type: "application/pdf" }));

  const result = await createTeacherResourceCore({
    user: { id: "teacher-1", roles: ["TEACHER"] },
    formData,
    prismaClient: prismaClient as unknown as Parameters<typeof createTeacherResourceCore>[0]["prismaClient"],
    uploadHandler: async ({ resourceId, file }) => {
      assert.equal(resourceId, "resource-native");
      assert.equal(file.name, "lesson.pdf");
      return { ok: true, assetId: "asset-1", objectKey: "resources/resource-native/lesson.pdf", readUrl: "/protected" };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(createdRecords[0].status, "DRAFT");
  assert.equal(createdRecords[0].contentUrl, null);
  assert.equal(createdRecords[0].externalUrl, null);
  assert.equal(updates.at(-1)?.status, "PENDING_REVIEW");
});

test("upload failure returns a retryable state without success", async () => {
  const deletedIds: string[] = [];
  const prismaClient = makePrisma("resource-upload-failure");
  prismaClient.resource.delete = async ({ where }) => {
    deletedIds.push(where.id);
  };
  const result = await createTeacherResourceCore({
    user: { id: "teacher-1", roles: ["TEACHER"] },
    formData: (() => {
      const formData = new FormData();
      formData.set("chapterId", "chapter-1");
      formData.set("resourceTypeId", "resource-type-1");
      formData.set("title", "Created");
      formData.set("format", "PDF");
      formData.set("sourceType", "native-pdf");
      formData.set("status", "DRAFT");
      formData.set("language", "ENGLISH");
      formData.set("access", "FREE");
      formData.set("file", new File(["pdf-data"], "lesson.pdf", { type: "application/pdf" }));
      return formData;
    })(),
    prismaClient: prismaClient as unknown as Parameters<typeof createTeacherResourceCore>[0]["prismaClient"],
    uploadHandler: async () => ({ ok: false, code: "UPLOAD_FAILED", message: "The file could not be stored. Please try again." }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "UPLOAD_FAILED");
  assert.equal(result.retryable, true);
  assert.equal("resourceId" in result, false);
  assert.deepEqual(deletedIds, ["resource-upload-failure"]);
});

test("unauthenticated and non-teacher users cannot create resources", async () => {
  const prismaClient = makePrisma("forbidden-resource");
  let createCount = 0;
  prismaClient.resource.create = async () => {
    createCount += 1;
    return { id: "forbidden-resource" };
  };

  const unauthenticated = await createTeacherResourceCore({
    user: { id: "", roles: [] },
    formData: new FormData(),
    prismaClient: prismaClient as unknown as Parameters<typeof createTeacherResourceCore>[0]["prismaClient"],
  });
  const student = await createTeacherResourceCore({
    user: { id: "student-1", roles: ["STUDENT"] },
    formData: new FormData(),
    prismaClient: prismaClient as unknown as Parameters<typeof createTeacherResourceCore>[0]["prismaClient"],
  });

  assert.equal(unauthenticated.ok, false);
  assert.equal(unauthenticated.code, "UNAUTHENTICATED");
  assert.equal(student.ok, false);
  assert.equal(student.code, "FORBIDDEN");
  assert.equal(createCount, 0);
});

test("teacher cannot attach a PDF to another teacher's resource", async () => {
  const result = await createTeacherResourceCore({
    user: { id: "teacher-1", roles: ["TEACHER"] },
    formData: (() => {
      const formData = new FormData();
      formData.set("chapterId", "chapter-1");
      formData.set("resourceTypeId", "resource-type-1");
      formData.set("title", "Created");
      formData.set("format", "PDF");
      formData.set("sourceType", "native-pdf");
      formData.set("status", "DRAFT");
      formData.set("language", "ENGLISH");
      formData.set("access", "FREE");
      formData.set("file", new File(["pdf-data"], "lesson.pdf", { type: "application/pdf" }));
      return formData;
    })(),
    prismaClient: {
      ...makePrisma("resource-forbidden"),
      resource: {
        ...makePrisma("resource-forbidden").resource,
        create: async () => ({ id: "resource-forbidden" }),
      },
    } as unknown as Parameters<typeof createTeacherResourceCore>[0]["prismaClient"],
    uploadHandler: async () => ({ ok: false, code: "FORBIDDEN", message: "You do not have permission to upload to this resource." }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "FORBIDDEN");
});
