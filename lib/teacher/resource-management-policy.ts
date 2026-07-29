import type { PublicationStatus } from "@/app/generated/prisma/enums";

export const TEACHER_MANAGED_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "REJECTED",
  "ARCHIVED",
] as const satisfies readonly PublicationStatus[];

export type TeacherResourceAction =
  | "VIEW"
  | "EDIT"
  | "SUBMIT"
  | "RESUBMIT"
  | "UNPUBLISH"
  | "ARCHIVE";

export type TeacherResourceTransition = "SUBMIT" | "RESUBMIT" | "UNPUBLISH" | "ARCHIVE";

const actionsByStatus: Record<PublicationStatus, readonly TeacherResourceAction[]> = {
  DRAFT: ["VIEW", "EDIT", "SUBMIT", "ARCHIVE"],
  PENDING_REVIEW: ["VIEW", "ARCHIVE"],
  REJECTED: ["VIEW", "EDIT", "RESUBMIT", "ARCHIVE"],
  PUBLISHED: ["VIEW", "UNPUBLISH", "ARCHIVE"],
  ARCHIVED: ["VIEW"],
};

export function getTeacherResourceActions(status: PublicationStatus) {
  return actionsByStatus[status];
}

export function canTeacherEditResource(status: PublicationStatus) {
  return getTeacherResourceActions(status).includes("EDIT");
}

export function getTeacherTransitionPolicy(transition: TeacherResourceTransition) {
  switch (transition) {
    case "SUBMIT":
      return {
        allowedStatuses: ["DRAFT"] as PublicationStatus[],
        data: {
          status: "PENDING_REVIEW" as const,
          publishedAt: null,
          moderationNote: null,
          reviewedAt: null,
          reviewedByUserId: null,
        },
      };
    case "RESUBMIT":
      return {
        allowedStatuses: ["REJECTED"] as PublicationStatus[],
        data: {
          status: "PENDING_REVIEW" as const,
          publishedAt: null,
          moderationNote: null,
          reviewedAt: null,
          reviewedByUserId: null,
        },
      };
    case "UNPUBLISH":
      return {
        allowedStatuses: ["PUBLISHED"] as PublicationStatus[],
        data: { status: "DRAFT" as const, publishedAt: null },
      };
    case "ARCHIVE":
      return {
        allowedStatuses: ["DRAFT", "PENDING_REVIEW", "REJECTED", "PUBLISHED"] as PublicationStatus[],
        data: { status: "ARCHIVED" as const, publishedAt: null },
      };
  }
}
