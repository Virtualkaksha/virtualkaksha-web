"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireCurrentRole } from "@/lib/auth/current-identity";
import { isSameOriginAction } from "@/lib/security/same-origin-action";
import { submitTeacherAccessRequest } from "@/lib/teacher/teacher-access-service";
import { teacherAccessRequestSchema } from "@/lib/teacher/teacher-access-validation";
import {
  approveTeacherAccessRequest,
  rejectTeacherAccessRequest,
} from "@/repositories/teacher-access.repository";

export type TeacherAccessActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

function buildRequestFromHeaders(headerList: Headers): Request {
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return new Request(`${proto}://${host}/teacher-access`, {
    headers: headerList,
  });
}

export async function requestTeacherAccessAction(
  _previous: TeacherAccessActionState,
  formData: FormData,
): Promise<TeacherAccessActionState> {
  const headerList = await headers();
  if (!isSameOriginAction(headerList)) {
    return { status: "error", message: "This request could not be verified. Refresh and try again." };
  }

  const parsed = teacherAccessRequestSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") ?? "",
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    city: formData.get("city") ?? "",
    subjects: formData.get("subjects"),
    experienceYears: formData.get("experienceYears") ?? "",
    message: formData.get("message") ?? "",
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await submitTeacherAccessRequest({
    ...parsed.data,
    lastName: parsed.data.lastName || undefined,
    phone: parsed.data.phone || undefined,
    city: parsed.data.city || undefined,
    message: parsed.data.message || undefined,
    experienceYears: parsed.data.experienceYears || undefined,
    request: buildRequestFromHeaders(headerList),
  });

  if (!result.accepted) {
    if (result.reason === "already-teacher") {
      return {
        status: "error",
        message: "This email already has teacher access. Please sign in instead.",
      };
    }
    if (result.reason === "duplicate-pending") {
      return {
        status: "error",
        message: "A request for this email is already waiting for admin review.",
      };
    }
    return {
      status: "error",
      message: `Too many requests. Try again in about ${result.retryAfterSeconds} seconds.`,
    };
  }

  redirect("/teacher-access?submitted=1");
}

export async function approveTeacherAccessAction(formData: FormData) {
  const admin = await requireCurrentRole("ADMIN");
  const requestId = String(formData.get("requestId") ?? "").trim();
  if (!requestId) redirect("/admin/teacher-requests?error=missing");

  const result = await approveTeacherAccessRequest({
    requestId,
    adminId: admin.id,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/teacher-requests");

  if (result.outcome === "unavailable") {
    redirect("/admin/teacher-requests?error=unavailable");
  }
  redirect("/admin/teacher-requests?approved=1");
}

export async function rejectTeacherAccessAction(formData: FormData) {
  const admin = await requireCurrentRole("ADMIN");
  const requestId = String(formData.get("requestId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!requestId) redirect("/admin/teacher-requests?error=missing");
  if (reason.length < 10) redirect(`/admin/teacher-requests?error=reason&focus=${requestId}`);

  const result = await rejectTeacherAccessRequest({
    requestId,
    adminId: admin.id,
    reason,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/teacher-requests");

  if (result.outcome === "unavailable") {
    redirect("/admin/teacher-requests?error=unavailable");
  }
  redirect("/admin/teacher-requests?rejected=1");
}
