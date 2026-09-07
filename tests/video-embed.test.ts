import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { resolveStudentResourceViewerState } from "@/lib/resources/student-resource-service";
import { buildContentSecurityPolicy } from "@/lib/security/csp";
import {
  buildYouTubeThumbnailUrl,
  isDisplayableThumbnailUrl,
  parseVimeoVideoId,
  parseYouTubeVideoId,
  resolveResourcePosterUrl,
  resolveVideoEmbed,
  VIDEO_FRAME_ORIGINS,
  VIDEO_FRAME_REFERRER_POLICY,
  VIDEO_IMAGE_ORIGINS,
} from "@/lib/resources/video-embed";

const VIDEO_ID = "dQw4w9WgXcQ";

test("every shape of YouTube link a teacher might paste resolves to the same video", () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    `https://www.youtube.com/watch?v=${VIDEO_ID}&t=42s&list=PL123`,
    `https://m.youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtu.be/${VIDEO_ID}`,
    `https://youtu.be/${VIDEO_ID}?t=10`,
    `https://www.youtube.com/embed/${VIDEO_ID}`,
    `https://www.youtube.com/shorts/${VIDEO_ID}`,
    `https://www.youtube.com/live/${VIDEO_ID}`,
    `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`,
    `  https://www.youtube.com/watch?v=${VIDEO_ID}  `,
  ]) {
    assert.equal(parseYouTubeVideoId(url), VIDEO_ID, `failed for ${url}`);
  }
});

test("non-YouTube, malformed and unsafe links are not treated as videos", () => {
  for (const url of [
    null,
    undefined,
    "",
    "not a url",
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "https://notyoutube.com/watch?v=dQw4w9WgXcQ",
    // A lookalike host must not pass.
    "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "https://www.youtube.com/watch?v=tooshort",
    "https://www.youtube.com/watch",
    "https://www.youtube.com/feed/subscriptions",
  ]) {
    assert.equal(parseYouTubeVideoId(url), null, `should not resolve ${String(url)}`);
  }
});

test("embeds use the cookie-deferring origin and derive their own poster image", () => {
  const embed = resolveVideoEmbed(`https://www.youtube.com/watch?v=${VIDEO_ID}`);
  assert.ok(embed);
  assert.equal(embed.provider, "youtube");
  assert.equal(embed.embedUrl, `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`);
  assert.equal(embed.thumbnailUrl, `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`);
  assert.doesNotMatch(embed.embedUrl, /(?<!-nocookie\.com)\/\/www\.youtube\.com/);
  assert.equal(buildYouTubeThumbnailUrl(VIDEO_ID), embed.thumbnailUrl);
});

test("the student viewer frames the embed URL rather than the pasted watch link", () => {
  const state = resolveStudentResourceViewerState({
    resource: {
      id: "resource-1",
      format: "VIDEO",
      contentUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
      externalUrl: null,
    } as never,
    asset: null,
  });

  assert.equal(state.viewerType, "external");
  assert.equal(state.sourceUrl, `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`);
  assert.equal(state.isPdf, false);
});

test("a poster is derived from the video link so older resources still get one", () => {
  const derived = resolveResourcePosterUrl({ thumbnailUrl: null, contentUrl: `https://youtu.be/${VIDEO_ID}` });
  assert.equal(derived, `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`);

  const fromExternal = resolveResourcePosterUrl({ externalUrl: `https://www.youtube.com/watch?v=${VIDEO_ID}` });
  assert.equal(fromExternal, `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`);
});

test("a stored poster is kept only when the policy would allow rendering it", () => {
  const allowed = `https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`;
  assert.equal(resolveResourcePosterUrl({ thumbnailUrl: allowed }), allowed);
  assert.equal(isDisplayableThumbnailUrl(allowed), true);

  // An arbitrary host would be blocked by the policy, so it must not be rendered.
  for (const blocked of ["https://example.com/poster.png", "http://i.ytimg.com/vi/x/1.jpg", "not-a-url", null]) {
    assert.equal(isDisplayableThumbnailUrl(blocked), false, `should refuse ${String(blocked)}`);
  }
  assert.equal(resolveResourcePosterUrl({ thumbnailUrl: "https://example.com/poster.png" }), null);
});

test("a PDF with no poster resolves to nothing rather than a wrong image", () => {
  assert.equal(resolveResourcePosterUrl({ thumbnailUrl: null, externalUrl: "https://example.com/notes.pdf" }), null);
  assert.equal(resolveResourcePosterUrl({}), null);
});

test("Vimeo links resolve to the player origin and reject lookalike hosts", () => {
  for (const url of [
    "https://vimeo.com/123456789",
    "https://www.vimeo.com/123456789",
    "https://player.vimeo.com/video/123456789",
    "https://vimeo.com/channels/staffpicks/123456789",
  ]) {
    assert.equal(parseVimeoVideoId(url), "123456789", `failed for ${url}`);
  }

  for (const url of ["https://vimeo.com.evil.test/123456789", "https://vimeo.com/notanid", "https://example.com/123456789"]) {
    assert.equal(parseVimeoVideoId(url), null, `should not resolve ${url}`);
  }

  const embed = resolveVideoEmbed("https://vimeo.com/123456789");
  assert.ok(embed);
  assert.equal(embed.provider, "vimeo");
  assert.equal(embed.embedUrl, "https://player.vimeo.com/video/123456789");
  assert.equal(embed.thumbnailUrl, null, "no poster is invented for Vimeo");
});

test("every embeddable origin is permitted by the content security policy", () => {
  const policy = buildContentSecurityPolicy("videoEmbedNonce123", "production");
  for (const origin of VIDEO_FRAME_ORIGINS) {
    assert.ok(policy.includes(`${origin}`), `${origin} must be allowed to frame`);
  }
  for (const origin of VIDEO_IMAGE_ORIGINS) {
    assert.ok(policy.includes(`${origin}`), `${origin} must be allowed as an image source`);
  }
  assert.equal(VIDEO_FRAME_REFERRER_POLICY, "strict-origin-when-cross-origin");
});

test("the resource page uses the shared resolver and sends a referrer to the player", async () => {
  const page = await readFile(
    "app/student/resources/[track]/[level]/[subject]/[chapter]/[resource]/page.tsx",
    "utf8",
  );
  assert.match(page, /resolveVideoEmbed\(sourceUrl\)/);
  assert.match(page, /referrerPolicy=\{VIDEO_FRAME_REFERRER_POLICY\}/);
  // The page must not carry its own weaker copy of the parsing rules.
  assert.doesNotMatch(page, /function getYouTubeEmbedUrl|function getVimeoEmbedUrl/);
  assert.doesNotMatch(page, /hostname\.includes\(/);
});

test("a non-video external link is passed through untouched", () => {
  const state = resolveStudentResourceViewerState({
    resource: {
      id: "resource-2",
      format: "EXTERNAL_LINK",
      contentUrl: null,
      externalUrl: "https://example.com/reading",
    } as never,
    asset: null,
  });

  assert.equal(state.sourceUrl, "https://example.com/reading");
});
