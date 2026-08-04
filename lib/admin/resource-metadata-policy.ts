import type { PublicationStatus } from "@/app/generated/prisma/enums";

export const ADMIN_METADATA_CONFLICT_MESSAGE = "This resource changed after you opened the form. Reload it and review the latest values before trying again.";

export function canAdminEditResourceMetadata(status: PublicationStatus) {
  return status !== "ARCHIVED";
}
export function canAdminEditResourceMapping(status: PublicationStatus) {
  return status === "DRAFT" || status === "REJECTED" || status === "PENDING_REVIEW";
}

export function statusAfterAdminMetadataEdit(status: PublicationStatus): PublicationStatus {
  return status === "PUBLISHED" ? "PENDING_REVIEW" : status;
}
