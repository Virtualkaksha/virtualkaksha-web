import assert from "node:assert/strict";
import test from "node:test";

import { resolveStudentResourceViewerState } from "@/lib/resources/student-resource-service";
import {
  buildYouTubeThumbnailUrl,
  parseYouTubeVideoId,
  resolveVideoEmbed,
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
