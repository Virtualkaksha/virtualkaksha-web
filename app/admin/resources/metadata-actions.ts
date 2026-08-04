"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentRole } from "@/lib/auth/current-identity";
import { limitAdminModeration } from "@/lib/admin/moderation-rate-limit";
import { parseAdminResourceMetadata } from "@/lib/admin/resource-metadata-validation";
import { updateAdminResourceMetadata } from "@/lib/admin/resource-metadata-service";
import { isSameOriginAction } from "@/lib/security/same-origin-action";

function rawResourceId(formData: FormData) {
  const values = formData.getAll("resourceId");
  return values.length === 1 && typeof values[0] === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(values[0]) ? values[0] : null;
}

export async function updateAdminResourceMetadataAction(formData: FormData) {
  if (!isSameOriginAction(await headers())) throw new Error("The request could not be verified.");
  const admin = await requireCurrentRole("ADMIN");
  const resourceId = rawResourceId(formData);
  if (!resourceId) throw new Error("The submitted resource is invalid.");
  const limit = await limitAdminModeration(admin.id, resourceId, "EDIT_METADATA");
  if (!limit.allowed) redirect(`/admin/resources/${resourceId}/edit?rateLimited=true&retryAfter=${limit.retryAfterSeconds}`);
  let input;
  try { input = parseAdminResourceMetadata(formData); }
  catch (error) { redirect(`/admin/resources/${resourceId}/edit?error=${encodeURIComponent(error instanceof Error ? error.message : "Invalid resource metadata.")}`); }
  const result = await updateAdminResourceMetadata({ ...input, actorUserId: admin.id });
  if (!result.ok) redirect(`/admin/resources/${resourceId}/edit?error=${encodeURIComponent(result.message)}&code=${result.code}`);
  if (!result.changed) redirect(`/admin/resources/${resourceId}/edit?unchanged=true`);
  for (const path of ["/admin", "/admin/resources", "/admin/resources/inventory", `/admin/resources/${resourceId}`, `/admin/resources/${resourceId}/edit`, "/teacher", "/teacher/resources", `/teacher/resources/${resourceId}`, "/search", "/student/resources", "/student/resources/search", result.previousPath, result.currentPath]) if (path) revalidatePath(path);
  redirect(`/admin/resources/${resourceId}/edit?updated=true`);
}
