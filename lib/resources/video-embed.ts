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
export const VIMEO_EMBED_ORIGIN = "https://player.vimeo.com";

/** Frame and image origins the content security policy must permit. */
export const VIDEO_FRAME_ORIGINS = Object.freeze([YOUTUBE_EMBED_ORIGIN, VIMEO_EMBED_ORIGIN]);
export const VIDEO_IMAGE_ORIGINS = Object.freeze([YOUTUBE_THUMBNAIL_ORIGIN]);

/**
 * YouTube requires a Referer header to identify the embedding site and rejects
 * the player with error 153 without one. This site sends no referrer by default,
 * so video frames opt into sending just the origin.
 */
export const VIDEO_FRAME_REFERRER_POLICY = "strict-origin-when-cross-origin";

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

const VIMEO_HOSTS: ReadonlySet<string> = new Set([
  "vimeo.com",
  "www.vimeo.com",
  "player.vimeo.com",
]);

const VIMEO_ID_PATTERN = /^[0-9]{6,12}$/;

export type VideoEmbed = {
  provider: "youtube" | "vimeo";
  videoId: string;
  embedUrl: string;
  /** Only providers with a predictable poster URL supply one. */
  thumbnailUrl: string | null;
};

export function parseVimeoVideoId(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  // Exact host matching; a lookalike such as vimeo.com.evil.test must not pass.
  if (!VIMEO_HOSTS.has(url.hostname.toLowerCase())) return null;

  const numericSegments = url.pathname.split("/").filter((segment) => VIMEO_ID_PATTERN.test(segment));
  return numericSegments.at(-1) ?? null;
}

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

/**
 * Whether a stored poster URL may be rendered.
 *
 * The content security policy only trusts the video thumbnail host, so an
 * arbitrary URL a teacher typed would be blocked in the browser. Such values are
 * ignored in favour of a placeholder rather than rendering a broken image.
 */
export function isDisplayableThumbnailUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) return false;
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && url.hostname === new URL(YOUTUBE_THUMBNAIL_ORIGIN).hostname;
  } catch {
    return false;
  }
}

/**
 * The poster to show for a resource: the stored thumbnail when it is one we can
 * render, otherwise one derived from the video link. Deriving at read time means
 * resources saved before posters existed still get one.
 */
export function resolveResourcePosterUrl(resource: {
  thumbnailUrl?: string | null;
  contentUrl?: string | null;
  externalUrl?: string | null;
}): string | null {
  if (isDisplayableThumbnailUrl(resource.thumbnailUrl)) return resource.thumbnailUrl ?? null;
  return resolveVideoEmbed(resource.contentUrl ?? resource.externalUrl)?.thumbnailUrl ?? null;
}

/** Returns null for anything that is not a recognised video link. */
export function resolveVideoEmbed(rawUrl: string | null | undefined): VideoEmbed | null {
  const youTubeId = parseYouTubeVideoId(rawUrl);
  if (youTubeId) {
    return {
      provider: "youtube",
      videoId: youTubeId,
      embedUrl: buildYouTubeEmbedUrl(youTubeId),
      thumbnailUrl: buildYouTubeThumbnailUrl(youTubeId),
    };
  }

  const vimeoId = parseVimeoVideoId(rawUrl);
  if (vimeoId) {
    return {
      provider: "vimeo",
      videoId: vimeoId,
      // A Vimeo poster needs an API lookup, so none is derived here.
      embedUrl: `${VIMEO_EMBED_ORIGIN}/video/${vimeoId}`,
      thumbnailUrl: null,
    };
  }

  return null;
}
