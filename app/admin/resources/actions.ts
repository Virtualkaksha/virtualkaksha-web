"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ContentLanguage,
  PublicationStatus,
  ResourceAccess,
  ResourceFormat,
} from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";

function getRequiredValue(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
}

function getOptionalValue(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    return null;
  }

  const cleanedValue = value.trim();

  return cleanedValue === "" ? null : cleanedValue;
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getOptionalNumber(formData: FormData, fieldName: string) {
  const value = getOptionalValue(formData, fieldName);

  if (!value) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new Error(`${fieldName} must be zero or a positive number.`);
  }

  return parsedValue;
}

async function createUniqueSlug(chapterId: string, title: string) {
  const baseSlug = createSlug(title) || `resource-${Date.now()}`;

  const existingResource = await prisma.resource.findFirst({
    where: {
      chapterId,
      slug: baseSlug,
    },
    select: {
      id: true,
    },
  });

  if (!existingResource) {
    return baseSlug;
  }

  let number = 2;

  while (number <= 100) {
    const newSlug = `${baseSlug}-${number}`;

    const duplicateResource = await prisma.resource.findFirst({
      where: {
        chapterId,
        slug: newSlug,
      },
      select: {
        id: true,
      },
    });

    if (!duplicateResource) {
      return newSlug;
    }

    number += 1;
  }

  return `${baseSlug}-${Date.now()}`;
}

export async function createResource(formData: FormData) {
  const chapterId = getRequiredValue(formData, "chapterId");
  const resourceTypeId = getRequiredValue(formData, "resourceTypeId");
  const title = getRequiredValue(formData, "title");

  const primaryTeacherProfileId = getOptionalValue(
    formData,
    "primaryTeacherProfileId"
  );

  const titleHindi = getOptionalValue(formData, "titleHindi");
  const description = getOptionalValue(formData, "description");
  const contentUrl = getOptionalValue(formData, "contentUrl");
  const externalUrl = getOptionalValue(formData, "externalUrl");
  const thumbnailUrl = getOptionalValue(formData, "thumbnailUrl");
  const textContent = getOptionalValue(formData, "textContent");

  const language = getRequiredValue(
    formData,
    "language"
  ) as ContentLanguage;

  const format = getRequiredValue(
    formData,
    "format"
  ) as ResourceFormat;

  const access = getRequiredValue(
    formData,
    "access"
  ) as ResourceAccess;

  const status = getRequiredValue(
    formData,
    "status"
  ) as PublicationStatus;

  const pageCount = getOptionalNumber(formData, "pageCount");
  const durationMinutes = getOptionalNumber(
    formData,
    "durationMinutes"
  );
  const sortOrder = getOptionalNumber(formData, "sortOrder") ?? 0;

  if (!contentUrl && !externalUrl && !textContent) {
    throw new Error(
      "Please provide a content URL, external URL or written content."
    );
  }

  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      isActive: true,
      boardClassSubject: {
        isActive: true,
        board: {
          isActive: true,
        },
        classLevel: {
          isActive: true,
        },
        subject: {
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      slug: true,
      boardClassSubject: {
        select: {
          board: {
            select: {
              slug: true,
            },
          },
          classLevel: {
            select: {
              slug: true,
            },
          },
          subject: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!chapter) {
    throw new Error("Selected chapter was not found.");
  }

  const resourceType = await prisma.resourceType.findFirst({
    where: {
      id: resourceTypeId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!resourceType) {
    throw new Error("Selected resource type was not found.");
  }

  if (primaryTeacherProfileId) {
    const teacherProfile = await prisma.teacherProfile.findFirst({
      where: {
        id: primaryTeacherProfileId,
        isAvailable: true,
      },
      select: {
        id: true,
      },
    });

    if (!teacherProfile) {
      throw new Error("Selected educator was not found or is unavailable.");
    }
  }

  const slug = await createUniqueSlug(chapterId, title);

  await prisma.resource.create({
    data: {
      chapterId,
      resourceTypeId,
      title,
      titleHindi,
      slug,
      description,
      language,
      format,
      access,
      status,
      contentUrl,
      externalUrl,
      thumbnailUrl,
      textContent,
      pageCount,
      durationSeconds:
        durationMinutes !== null ? durationMinutes * 60 : null,
      sortOrder,
      publishedAt:
        status === PublicationStatus.PUBLISHED ? new Date() : null,
      teachers: primaryTeacherProfileId
        ? {
            create: {
              teacherProfileId: primaryTeacherProfileId,
              isPrimary: true,
              displayOrder: 0,
            },
          }
        : undefined,
    },
  });

  const boardSlug =
    chapter.boardClassSubject.board.slug;

  const classSlug =
    chapter.boardClassSubject.classLevel.slug;

  const subjectSlug =
    chapter.boardClassSubject.subject.slug;

  revalidatePath("/admin/resources");

  revalidatePath(
    `/student/resources/${boardSlug}/${classSlug}/${subjectSlug}/${chapter.slug}`
  );

  redirect("/admin/resources?created=true");
}