export type ActiveAssetResource<T> = {
  activeAssetId?: string | null;
  activeAsset?: T | null;
  assets: T[];
};

/** Temporary C1 fallback: remove after every environment has activeAssetId backfilled. */
export function resolveActiveAsset<T>(resource: ActiveAssetResource<T>): T | null {
  if (resource.activeAssetId) return resource.activeAsset ?? null;
  return resource.assets[0] ?? null;
}

export function hasReadyActiveAsset<T extends { status: string }>(resource: ActiveAssetResource<T>) {
  return resolveActiveAsset(resource)?.status === "READY";
}
