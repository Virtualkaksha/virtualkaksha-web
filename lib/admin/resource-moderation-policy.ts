export type AdminModerationAction = "APPROVE" | "REJECT" | "ARCHIVE";

type ModerationStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "REJECTED"
  | "ARCHIVED";

const actionsByStatus: Record<ModerationStatus, readonly AdminModerationAction[]> = {
  DRAFT: [],
  PENDING_REVIEW: ["APPROVE", "REJECT", "ARCHIVE"],
  PUBLISHED: ["ARCHIVE"],
  REJECTED: ["ARCHIVE"],
  ARCHIVED: [],
};

const allowedStatusesByAction: Record<AdminModerationAction, readonly ModerationStatus[]> = {
  APPROVE: ["PENDING_REVIEW"],
  REJECT: ["PENDING_REVIEW"],
  ARCHIVE: ["PENDING_REVIEW", "PUBLISHED", "REJECTED"],
};

export function getAdminModerationActions(status: ModerationStatus) {
  return actionsByStatus[status];
}

export function getAllowedAdminModerationStatuses(action: AdminModerationAction) {
  return allowedStatusesByAction[action];
}

export const INVALID_ADMIN_MODERATION_TRANSITION =
  "The resource is no longer in a state that allows this moderation action.";

type ModerationUpdate = {
  where: {
    id: string;
    status: { in: ModerationStatus[] };
  };
  data: {
    status: "PUBLISHED" | "REJECTED" | "ARCHIVED";
    publishedAt: Date | null;
    reviewedAt: Date;
    reviewedByUserId: string;
    moderationNote?: string | null;
  };
};

export async function transitionAdminResource(
  input: {
    resourceId: string;
    adminId: string;
    action: AdminModerationAction;
    reason?: string;
    now?: Date;
  },
  updateMany: (update: ModerationUpdate) => Promise<{ count: number }>,
) {
  const now = input.now ?? new Date();
  const common = { reviewedAt: now, reviewedByUserId: input.adminId };
  const data = input.action === "APPROVE"
    ? { ...common, status: "PUBLISHED" as const, publishedAt: now, moderationNote: null }
    : input.action === "REJECT"
      ? { ...common, status: "REJECTED" as const, publishedAt: null, moderationNote: input.reason ?? "" }
      : { ...common, status: "ARCHIVED" as const, publishedAt: null };

  const result = await updateMany({
    where: {
      id: input.resourceId,
      status: { in: [...getAllowedAdminModerationStatuses(input.action)] },
    },
    data,
  });
  if (result.count !== 1) throw new Error(INVALID_ADMIN_MODERATION_TRANSITION);
}
