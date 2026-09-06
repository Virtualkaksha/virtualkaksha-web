import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

import { buildContentSecurityPolicy } from "@/lib/security/csp";

const fonts = [
  {
    path: "app/fonts/geist-sans-variable.woff2",
    hash: "c2a45610c45081b940562b38437b3128ee287c564ae759a758dbad8a90a32349",
    upstream: "fonts/Geist/webfonts/Geist[wght].woff2",
  },
  {
    path: "app/fonts/geist-mono-variable.woff2",
    hash: "4e772ac3c650b07abd180140088b0a7c84ec016cc6385cb7dfc21beb9e258815",
    upstream: "fonts/GeistMono/webfonts/GeistMono[wght].woff2",
  },
] as const;

test("layout uses only the two local Geist variable fonts", async () => {
  const layout = await readFile("app/layout.tsx", "utf8");
  assert.match(layout, /import localFont from "next\/font\/local"/);
  assert.doesNotMatch(layout, /next\/font\/google|fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(layout, /src: "\.\/fonts\/geist-sans-variable\.woff2"/);
  assert.match(layout, /src: "\.\/fonts\/geist-mono-variable\.woff2"/);
  assert.match(layout, /variable: "--font-geist-sans"/);
  assert.match(layout, /variable: "--font-geist-mono"/);
  assert.equal((layout.match(/weight: "100 900"/g) ?? []).length, 2);
  assert.equal((layout.match(/style: "normal"/g) ?? []).length, 2);
  assert.equal((layout.match(/display: "swap"/g) ?? []).length, 2);
  assert.doesNotMatch(layout, /next\/dist|@vercel\/og|__nextjs_font/);
  // Font files must never be fetched from a remote origin; unrelated URLs such as
  // metadataBase are allowed.
  assert.doesNotMatch(layout, /https?:\/\/[^"'\s]*\.(?:woff2?|ttf|otf|eot)/);
});

test("committed fonts are valid non-empty WOFF2 files with pinned hashes", async () => {
  for (const font of fonts) {
    const bytes = await readFile(font.path);
    const metadata = await stat(font.path);
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "wOF2");
    assert.equal(bytes.readUInt32BE(8), bytes.length);
    assert.ok(metadata.size >= 50_000 && metadata.size <= 150_000);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), font.hash);
  }
});

test("license and provenance identify the official pinned release", async () => {
  const license = await readFile("app/fonts/OFL.txt", "utf8");
  const source = await readFile("app/fonts/SOURCE.md", "utf8");
  assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(license, /Copyright \(c\) 2023 Vercel, in collaboration with basement\.studio/);
  assert.match(source, /github\.com\/vercel\/geist-font/);
  assert.match(source, /Release\/tag: `1\.8\.0`/);
  assert.match(source, /Commit: `91158e0`/);
  assert.match(source, /unmodified/i);
  for (const font of fonts) {
    assert.ok(source.includes(font.upstream));
    assert.ok(source.includes(font.hash));
  }
});

test("Tailwind font mappings retain the stable Geist variables", async () => {
  const globals = await readFile("app/globals.css", "utf8");
  assert.match(globals, /--font-sans:\s*var\(--font-geist-sans\);/);
  assert.match(globals, /--font-mono:\s*var\(--font-geist-mono\);/);
  assert.match(globals, /--font-heading:\s*var\(--font-sans\);/);
  assert.doesNotMatch(globals, /--font-sans:\s*var\(--font-sans\);/);
  assert.doesNotMatch(globals, /fonts\.googleapis\.com|fonts\.gstatic\.com|https?:\/\/|next\/dist|__nextjs_font/);
});

test("CSP permits same-origin fonts without external font origins", () => {
  const policy = buildContentSecurityPolicy("localFontNonce123", "production");
  assert.match(policy, /(?:^|; )font-src 'self'(?:;|$)/);
  assert.doesNotMatch(policy, /fonts\.googleapis\.com|fonts\.gstatic\.com|https:\s|\*/);
});
