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
    },
  };
}

test("external URL flow still creates a resource", async () => {
  const result = await createTeacherResourceCore({
    user: { id: "teacher-1", roles: ["TEACHER"] },
    formData: (() => {
      const formData = new FormData();
      formData.set("chapterId", "chapter-1");
      formData.set("resourceTypeId", "resource-type-1");
      formData.set("title", "External resource");
      formData.set("format", "PDF");
      formData.set("contentUrl", "https://example.com/file.pdf");
      formData.set("status", "DRAFT");
      formData.set("language", "ENGLISH");
      formData.set("access", "FREE");
      return formData;
    })(),
    prismaClient: makePrisma("resource-external") as unknown as Parameters<typeof createTeacherResourceCore>[0]["prismaClient"],
    uploadHandler: async () => ({ ok: true, assetId: "asset-1", objectKey: "obj", readUrl: "/files/obj" }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.resourceId, "resource-external");
  assert.equal(result.code, undefined);
});

test("PDF mode requires a PDF file", async () => {
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
    prismaClient: makePrisma("resource-pdf-invalid") as unknown as Parameters<typeof createTeacherResourceCore>[0]["prismaClient"],
    uploadHandler: async () => ({ ok: true, assetId: "asset-1", objectKey: "obj", readUrl: "/files/obj" }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_FILE");
});

test("upload failure returns a retryable state without success", async () => {
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
    prismaClient: makePrisma("resource-upload-failure") as unknown as Parameters<typeof createTeacherResourceCore>[0]["prismaClient"],
    uploadHandler: async () => ({ ok: false, code: "UPLOAD_FAILED", message: "The file could not be stored. Please try again." }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "UPLOAD_FAILED");
  assert.equal(result.retryable, true);
  assert.equal(result.resourceId, "resource-upload-failure");
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
