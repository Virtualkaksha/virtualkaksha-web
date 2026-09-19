"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { changeOwnPasswordHash } from "@/lib/auth/account-security";
import { DUMMY_PASSWORD_HASH } from "@/lib/auth/credentials-authentication";
import { requireCurrentRole } from "@/lib/auth/current-identity";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { changeStudentPasswordSchema, studentProfileSchema } from "@/lib/auth/validation";
import prisma from "@/lib/prisma";
import { isSameOriginAction } from "@/lib/security/same-origin-action";
import { getStudentClassScope } from "@/lib/students/class-scope";
import { STUDENT_BOARD_SLUGS, STUDENT_CLASS_SLUGS, studentBoardName, studentClassName } from "@/lib/students/class-options";
import { encodeStudentAvatar } from "@/lib/students/profile-avatar";

export type UpdateStudentClassState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function updateStudentClassAction(
  _previous: UpdateStudentClassState,
  formData: FormData,
): Promise<UpdateStudentClassState> {
  if (!isSameOriginAction(await headers())) {
    return { status: "error", message: "This request could not be verified. Refresh and try again." };
  }

  const user = await requireCurrentRole("STUDENT");
  const boardSlug = String(formData.get("board") ?? "").trim();
  const classSlug = String(formData.get("classLevel") ?? "").trim();

  if (!STUDENT_BOARD_SLUGS.includes(boardSlug as (typeof STUDENT_BOARD_SLUGS)[number])) {
    return { status: "error", message: "Select a supported board." };
  }
  if (!STUDENT_CLASS_SLUGS.includes(classSlug as (typeof STUDENT_CLASS_SLUGS)[number])) {
    return { status: "error", message: "Select your class." };
  }

  const current = await getStudentClassScope(user.id);
  const changing = Boolean(
    current && (current.boardSlug !== boardSlug || current.classSlug !== classSlug),
  );
  if (changing && formData.get("confirmClassChange") !== "on") {
    return {
      status: "error",
      message: `Confirm that you want to switch to ${studentClassName(classSlug)} · ${studentBoardName(boardSlug)}. Resources from your current class will be hidden until you switch back.`,
    };
  }

  const [board, classLevel] = await Promise.all([
    prisma.board.findFirst({ where: { slug: boardSlug, isActive: true }, select: { id: true } }),
    prisma.classLevel.findFirst({ where: { slug: classSlug, isActive: true }, select: { id: true } }),
  ]);
  if (!board || !classLevel) {
    return { status: "error", message: "That class is not available yet." };
  }

  await prisma.studentProfile.update({
    where: { userId: user.id },
    data: { boardId: board.id, classLevelId: classLevel.id },
  });
  revalidatePath("/student", "layout");
  revalidatePath("/student");
  revalidatePath("/student/resources");
  revalidatePath("/student/profile");
  revalidatePath("/search");
  if (!changing && current) {
    return { status: "success", message: "Your class is already set to this." };
  }
  return { status: "success", message: "Your class was updated. Resources will now match this class." };
}

export type UpdateStudentProfileState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function updateStudentProfileAction(
  _previous: UpdateStudentProfileState,
  formData: FormData,
): Promise<UpdateStudentProfileState> {
  if (!isSameOriginAction(await headers())) {
    return { status: "error", message: "This request could not be verified. Refresh and try again." };
  }

  const user = await requireCurrentRole("STUDENT");
  const parsed = studentProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const removePhoto = formData.get("removePhoto") === "on";
  const photo = formData.get("photo");
  let avatarUrl: string | null | undefined;
  if (removePhoto) {
    avatarUrl = null;
  } else if (photo instanceof File && photo.size > 0) {
    const encoded = encodeStudentAvatar(new Uint8Array(await photo.arrayBuffer()), photo.type);
    if (!encoded.ok) return { status: "error", message: encoded.message };
    avatarUrl = encoded.dataUrl;
  }

  const lastName = parsed.data.lastName?.trim() || null;
  const displayName = [parsed.data.firstName, lastName].filter(Boolean).join(" ");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: parsed.data.firstName,
      lastName,
      displayName,
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    },
  });
  revalidatePath("/student", "layout");
  revalidatePath("/student");
  revalidatePath("/student/profile");
  return { status: "success", message: "Your profile was updated." };
}

export type ChangeStudentPasswordState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function changeStudentPasswordAction(
  _previous: ChangeStudentPasswordState,
  formData: FormData,
): Promise<ChangeStudentPasswordState> {
  if (!isSameOriginAction(await headers())) {
    return { status: "error", message: "This request could not be verified. Refresh and try again." };
  }

  const user = await requireCurrentRole("STUDENT");
  const parsed = changeStudentPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, passwordHash: true },
  });
  const currentMatches = await verifyPassword(
    parsed.data.currentPassword,
    record?.passwordHash || DUMMY_PASSWORD_HASH,
  );
  if (!record?.passwordHash || !currentMatches) {
    return { status: "error", message: "Current password is incorrect." };
  }

  const result = await changeOwnPasswordHash(await hashPassword(parsed.data.newPassword));
  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  try {
    await signIn("credentials", {
      email: record.email,
      password: parsed.data.newPassword,
      expectedRole: "STUDENT",
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { status: "success", message: "Password updated. Sign in again with your new password." };
    }
    throw error;
  }

  return { status: "success", message: "Password updated. Other devices have been signed out." };
}
