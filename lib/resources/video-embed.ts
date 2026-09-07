/**
 * Turns a pasted video link into something the student viewer can actually frame.
 *
 * A normal YouTube watch link refuses to be embedded, so a teacher pasting the
 * URL from their browser would produce a lesson that never plays. Links are
 * therefore normalised to an embed URL, and the poster image is derived from the
 * same video id so nobody has to hunt for one.
 *
 * Embeds use youtube-nocookie.com: it defers YouTube's tracking cookies until a
 * student presses play, which matters on a platform used by minors.
 */

export const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com";
export const YOUTUBE_THUMBNAIL_ORIGIN = "https://i.ytimg.com";

const YOUTUBE_HOSTS: ReadonlySet<string> = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

/** YouTube ids are exactly 11 characters from a URL-safe alphabet. */
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const PATH_ID_PREFIXES: ReadonlySet<string> = new Set(["embed", "shorts", "live", "v"]);

export type VideoEmbed = {
  provider: "youtube";
  videoId: string;
  embedUrl: string;
  thumbnailUrl: string;
};

export function parseYouTubeVideoId(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  const isShortLink = host === "youtu.be" || host === "www.youtu.be";

  const candidate = isShortLink
    ? segments[0]
    : url.pathname.toLowerCase() === "/watch"
      ? url.searchParams.get("v")
      : segments[0] && PATH_ID_PREFIXES.has(segments[0].toLowerCase())
        ? segments[1]
        : null;

  return candidate && VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
}

export function buildYouTubeEmbedUrl(videoId: string) {
  return `${YOUTUBE_EMBED_ORIGIN}/embed/${videoId}`;
}

export function buildYouTubeThumbnailUrl(videoId: string) {
  return `${YOUTUBE_THUMBNAIL_ORIGIN}/vi/${videoId}/hqdefault.jpg`;
}

/** Returns null for anything that is not a recognised video link. */
export function resolveVideoEmbed(rawUrl: string | null | undefined): VideoEmbed | null {
  const videoId = parseYouTubeVideoId(rawUrl);
  if (!videoId) return null;

  return {
    provider: "youtube",
    videoId,
    embedUrl: buildYouTubeEmbedUrl(videoId),
    thumbnailUrl: buildYouTubeThumbnailUrl(videoId),
  };
}
