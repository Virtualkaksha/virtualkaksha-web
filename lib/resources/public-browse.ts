import type { ResourceSearchQuery } from "./resource-search-query";

export const PUBLIC_BOARD_SLUG = "cbse";
export const DEFAULT_PUBLIC_CLASS_SLUG = "class-10";

export type PublicBrowseStep = "classes" | "subjects" | "chapters" | "resources";

export function resolvePublicBrowseStep(
  query: Pick<ResourceSearchQuery, "q" | "level" | "subject" | "chapter">,
): PublicBrowseStep {
  if (query.q.trim() || query.chapter) return "resources";
  if (query.level && query.subject) return "chapters";
  if (query.level) return "subjects";
  return "classes";
}

export function withPublicBrowseDefaults(
  query: ResourceSearchQuery,
  preferred?: { boardSlug?: string; classSlug?: string } | null,
): ResourceSearchQuery {
  const board = query.track || preferred?.boardSlug || PUBLIC_BOARD_SLUG;
  const classSlug = preferred?.classSlug || query.level || (query.q.trim() ? query.level : DEFAULT_PUBLIC_CLASS_SLUG);
  return {
    ...query,
    track: board,
    trackType: query.trackType ?? "BOARD",
    level: preferred?.classSlug ? preferred.classSlug : classSlug,
  };
}

export function publicBrowseHref(
  query: Pick<ResourceSearchQuery, "q" | "type" | "track" | "trackType">,
  selection: { level?: string; subject?: string; chapter?: string } = {},
) {
  const params = new URLSearchParams();
  const track = query.track || PUBLIC_BOARD_SLUG;
  const trackType = query.trackType || "BOARD";
  params.set("track", track);
  params.set("trackType", trackType);
  if (query.q) params.set("q", query.q);
  if (query.type) params.set("type", query.type);
  if (selection.level) params.set("level", selection.level);
  if (selection.subject) params.set("subject", selection.subject);
  if (selection.chapter) params.set("chapter", selection.chapter);
  return `/search?${params.toString()}`;
}
