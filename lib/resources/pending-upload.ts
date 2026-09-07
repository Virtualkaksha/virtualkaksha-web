import { randomUUID } from "node:crypto";

/**
 * Direct browser uploads are staged under this prefix because the final key
 * depends on a resource that does not exist yet. Objects here are expected to
 * carry a storage expiry rule, so a verified upload is always moved out before
 * it becomes a live asset.
 */
export const PENDING_UPLOAD_PREFIX = "uploads";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function buildPendingUploadObjectKey(userId: string) {
  if (!SAFE_ID_PATTERN.test(userId)) throw new Error("Invalid upload owner.");
  return `${PENDING_UPLOAD_PREFIX}/${userId}/${randomUUID()}.pdf`;
}

export function buildResourceAssetObjectKey(resourceId: string) {
  if (!SAFE_ID_PATTERN.test(resourceId)) throw new Error("Invalid resource.");
  return `resources/${resourceId}/${randomUUID()}.pdf`;
}

/**
 * The staging key arrives from the browser, so its shape is never trusted: it
 * must match the generated layout exactly and name the calling user. Anything
 * else could point at another teacher's upload or an unrelated object.
 */
export function isPendingUploadOwnedBy(objectKey: string, userId: string) {
  if (typeof objectKey !== "string" || !SAFE_ID_PATTERN.test(userId)) return false;

  const segments = objectKey.split("/");
  if (segments.length !== 3) return false;

  const [prefix, owner, fileName] = segments;
  if (prefix !== PENDING_UPLOAD_PREFIX || owner !== userId) return false;
  if (!fileName.endsWith(".pdf")) return false;

  return UUID_PATTERN.test(fileName.slice(0, -".pdf".length));
}
