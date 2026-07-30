import "server-only";

import { findAdminDashboardData, findModerationResource, findModerationResources } from "@/repositories/admin-moderation.repository";

const nameOf = (user: { displayName: string | null; firstName: string; lastName: string | null } | null) =>
  user?.displayName ??
([user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Unknown user");

export async function getAdminDashboard() {
  const data = await findAdminDashboardData();
  return { ...data, recent: data.recent.map((item) => ({ ...item, creatorName: nameOf(item.createdBy) })) };
}

export async function getModerationQueue(status?: string, query?: string) {
  const resources = await findModerationResources(status, query);
  return resources.map((item) => ({ ...item, creatorName: nameOf(item.createdBy) }));
}

export async function getModerationResource(resourceId: string) {
  const item = await findModerationResource(resourceId);
  if (!item) return null;
  const { assets, ...safeItem } = item;
  const primaryAsset = assets[0] ?? null;
  const isNativePdf = safeItem.format === "PDF" && (primaryAsset !== null || !safeItem.externalUrl);
  return {
    ...safeItem,
    creatorName: nameOf(item.createdBy),
    reviewerName: nameOf(item.reviewedBy),
    nativePdf: {
      isNativePdf,
      hasPrimaryAsset: isNativePdf && primaryAsset !== null,
      assetStatus: isNativePdf ? primaryAsset?.status ?? "MISSING" : null,
    },
  };
}
