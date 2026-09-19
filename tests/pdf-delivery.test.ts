import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import "./helpers/server-only";

import { LocalResourceStorageProvider } from "@/lib/resources/local-storage-provider";
import { S3ResourceStorageProvider } from "@/lib/resources/s3-storage-provider";
import { presignedPdfResponse } from "@/lib/resources/pdf-delivery";

const s3Config = {
  endpoint: "https://storage.example.test/",
  region: "auto",
  bucket: "private-resources",
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret-key",
  forcePathStyle: false,
};

const asset = { provider: "s3", objectKey: "resources/resource-1/file.pdf" };

function presignCapableProvider(signedUrl = "https://storage.example.test/signed?sig=abc") {
  return new S3ResourceStorageProvider(
    s3Config,
    { send: async () => ({}) },
    async () => signedUrl,
  );
}

test("an authorized PDF request redirects to a short-lived direct URL that is never cached", async () => {
  const response = await presignedPdfResponse(asset, {
    createProvider: () => presignCapableProvider(),
  });

  assert.ok(response);
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://storage.example.test/signed?sig=abc");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(await response.text(), "", "the function must not carry the file bytes");
});

test("a provider that cannot presign keeps the caller on its buffered path", async () => {
  const response = await presignedPdfResponse(
    { provider: "local", objectKey: "resources/resource-1/file.pdf" },
    { createProvider: () => new LocalResourceStorageProvider("./storage/resources") },
  );
  assert.equal(response, null);
});

test("callers that supply their own bytes never cause a URL to be signed", async () => {
  let created = 0;
  const response = await presignedPdfResponse(asset, {
    skip: true,
    createProvider: () => {
      created += 1;
      return presignCapableProvider();
    },
  });

  assert.equal(response, null);
  assert.equal(created, 0);
});

test("a signing failure falls back rather than failing the request", async () => {
  const response = await presignedPdfResponse(asset, {
    createProvider: () => new S3ResourceStorageProvider(
      s3Config,
      { send: async () => ({}) },
      async () => { throw new Error("signer unavailable"); },
    ),
  });
  assert.equal(response, null);
});

test("student viewers receive proxied PDF bytes instead of a cross-origin redirect", async () => {
  const { proxyPresignedPdfRedirect } = await import("@/lib/resources/pdf-delivery");
  const redirect = await presignedPdfResponse(asset, {
    createProvider: () => presignCapableProvider("https://storage.example.test/signed?sig=abc"),
  });
  assert.ok(redirect);
  const pdf = Buffer.from("%PDF-1.7 test");
  const proxied = await proxyPresignedPdfRedirect(redirect!, async (url) => {
    assert.equal(String(url), "https://storage.example.test/signed?sig=abc");
    return new Response(pdf, { status: 200, headers: { "Content-Type": "application/pdf" } });
  });
  assert.ok(proxied);
  assert.equal(proxied.status, 200);
  assert.equal(proxied.headers.get("content-type"), "application/pdf");
  assert.equal(proxied.headers.get("cache-control"), "private, no-store");
  assert.equal(await proxied.text(), pdf.toString());
});

test("every asset route authorizes and then redirects before reading any bytes", async () => {
  const routes = [
    "app/api/student/resources/[resourceId]/asset/route.ts",
    "app/api/teacher/resources/[resourceId]/asset/route.ts",
    "app/api/admin/resources/[resourceId]/asset/route.ts",
  ];

  for (const route of routes) {
    const source = await readFile(route, "utf8");
    assert.match(source, /presignedPdfResponse/, `${route} must offer a presigned redirect`);
    if (route.includes("/student/")) {
      assert.match(source, /proxyPresignedPdfRedirect/, `${route} must proxy the signed URL for pdf.js`);
    }

    const redirectAt = source.indexOf("presignedPdfResponse(");
    const authorizeAt = source.search(/resolve(?:Optional)?(?:Student|Teacher|Admin)Identity\(/);
    const readAt = source.indexOf("const readFile =");

    assert.ok(authorizeAt >= 0 && authorizeAt < redirectAt, `${route} must authorize before signing`);
    assert.ok(redirectAt < readAt, `${route} must redirect before falling back to reading bytes`);
  }
});
