import "server-only";

import { ADMIN_METADATA_CONFLICT_MESSAGE } from "@/lib/admin/resource-metadata-policy";
import type { ValidatedAdminResourceMetadata } from "@/lib/admin/resource-metadata-validation";

export type AdminMetadataResult =
  | { ok: true; changed: boolean; version: number; previousPath?: string | null; currentPath?: string | null }
  | { ok: false; code: "NOT_FOUND" | "READ_ONLY" | "CONFLICT" | "INVALID_REFERENCE" | "MAPPING_LOCKED" | "SLUG_CONFLICT" | "UNAVAILABLE"; message: string };

export async function updateAdminResourceMetadata(input: ValidatedAdminResourceMetadata & { actorUserId: string }, transact?: typeof import("@/repositories/admin-resource-metadata.repository").transactAdminResourceMetadataEdit): Promise<AdminMetadataResult> {
  try {
    const repository = transact ?? (await import("@/repositories/admin-resource-metadata.repository")).transactAdminResourceMetadataEdit;
    const result = await repository(input);
    if (result.outcome === "UPDATED") return { ok: true, changed: true, version: result.version, previousPath: result.previousPath, currentPath: result.currentPath };
    if (result.outcome === "NO_CHANGE") return { ok: true, changed: false, version: result.version };
    if (result.outcome === "CONFLICT") return { ok: false, code: "CONFLICT", message: ADMIN_METADATA_CONFLICT_MESSAGE };
    const messages = {
      NOT_FOUND: "The resource is unavailable.", READ_ONLY: "Archived resources are read-only.",
      INVALID_REFERENCE: "The selected catalogue entry is unavailable.", MAPPING_LOCKED: "Published resource mapping cannot be changed.",
      SLUG_CONFLICT: "That academic mapping already contains a resource with this URL slug.",
    } as const;
    return { ok: false, code: result.outcome, message: messages[result.outcome] };
  } catch {
    return { ok: false, code: "UNAVAILABLE", message: "Resource metadata could not be saved. Try again later." };
  }
}
