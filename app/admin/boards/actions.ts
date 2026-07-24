"use server";

import { BoardType } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function getRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

function getOptionalString(
  formData: FormData,
  key: string,
): string | null {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return value.trim();
}

function createSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getBoardType(formData: FormData): BoardType {
  const value = getRequiredString(formData, "boardType");

  if (
    value !== BoardType.NATIONAL &&
    value !== BoardType.STATE
  ) {
    throw new Error("Invalid board type.");
  }

  return value;
}

function getSortOrder(formData: FormData): number {
  const value = getOptionalString(formData, "sortOrder");

  if (value === null) {
    return 0;
  }

  const sortOrder = Number(value);

  if (!Number.isInteger(sortOrder)) {
    throw new Error("Sort order must be a whole number.");
  }

  return sortOrder;
}

export async function createBoard(
  formData: FormData,
): Promise<void> {
  const name = getRequiredString(formData, "name");

  const shortName = getRequiredString(
    formData,
    "shortName",
  ).toUpperCase();

  const boardType = getBoardType(formData);

  const customSlug = getOptionalString(formData, "slug");

  const slug = createSlug(customSlug ?? shortName);

  const stateName =
    boardType === BoardType.STATE
      ? getRequiredString(formData, "stateName")
      : null;

  const stateCode =
    boardType === BoardType.STATE
      ? getRequiredString(formData, "stateCode").toUpperCase()
      : null;

  const description = getOptionalString(
    formData,
    "description",
  );

  const sortOrder = getSortOrder(formData);

  if (!slug) {
    throw new Error("A valid slug could not be generated.");
  }

  const existingBoard = await prisma.board.findFirst({
    where: {
      OR: [
        {
          slug,
        },
        {
          shortName,
          stateCode,
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (existingBoard) {
    throw new Error(
      "A board with this slug, short name or state code already exists.",
    );
  }

  await prisma.board.create({
    data: {
      name,
      shortName,
      slug,
      boardType,
      stateName,
      stateCode,
      description,
      sortOrder,
      isActive: true,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/boards");
  revalidatePath("/student/resources");
}

export async function updateBoard(
  formData: FormData,
): Promise<void> {
  const boardId = getRequiredString(formData, "boardId");

  const name = getRequiredString(formData, "name");

  const shortName = getRequiredString(
    formData,
    "shortName",
  ).toUpperCase();

  const boardType = getBoardType(formData);

  const customSlug = getOptionalString(formData, "slug");

  const slug = createSlug(customSlug ?? shortName);

  const stateName =
    boardType === BoardType.STATE
      ? getRequiredString(formData, "stateName")
      : null;

  const stateCode =
    boardType === BoardType.STATE
      ? getRequiredString(formData, "stateCode").toUpperCase()
      : null;

  const description = getOptionalString(
    formData,
    "description",
  );

  const sortOrder = getSortOrder(formData);

  if (!slug) {
    throw new Error("A valid slug could not be generated.");
  }

  const board = await prisma.board.findUnique({
    where: {
      id: boardId,
    },
    select: {
      id: true,
    },
  });

  if (!board) {
    throw new Error("Board not found.");
  }

  const conflictingBoard = await prisma.board.findFirst({
    where: {
      id: {
        not: boardId,
      },
      OR: [
        {
          slug,
        },
        {
          shortName,
          stateCode,
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (conflictingBoard) {
    throw new Error(
      "Another board with this slug, short name or state code already exists.",
    );
  }

  await prisma.board.update({
    where: {
      id: boardId,
    },
    data: {
      name,
      shortName,
      slug,
      boardType,
      stateName,
      stateCode,
      description,
      sortOrder,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/boards");
  revalidatePath("/student/resources");
}

export async function toggleBoardStatus(
  formData: FormData,
): Promise<void> {
  const boardId = getRequiredString(formData, "boardId");

  const board = await prisma.board.findUnique({
    where: {
      id: boardId,
    },
    select: {
      isActive: true,
    },
  });

  if (!board) {
    throw new Error("Board not found.");
  }

  await prisma.board.update({
    where: {
      id: boardId,
    },
    data: {
      isActive: !board.isActive,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/boards");
  revalidatePath("/student/resources");
}

export async function deleteBoard(
  formData: FormData,
): Promise<void> {
  const boardId = getRequiredString(formData, "boardId");

  const board = await prisma.board.findUnique({
    where: {
      id: boardId,
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          boardClassSubjects: true,
          studentProfiles: true,
        },
      },
    },
  });

  if (!board) {
    throw new Error("Board not found.");
  }

  const hasAcademicContent =
    board._count.boardClassSubjects > 0;

  const hasStudentProfiles =
    board._count.studentProfiles > 0;

  if (hasAcademicContent || hasStudentProfiles) {
    throw new Error(
      `${board.name} cannot be deleted because academic content or student profiles are connected to it. Deactivate it instead.`,
    );
  }

  await prisma.board.delete({
    where: {
      id: boardId,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/boards");
  revalidatePath("/student/resources");
}