import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

import { S3ResourceStorageProvider } from "../lib/resources/s3-storage-provider";

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing.`);
  return value;
}

async function readLocalAsset(objectKey: string) {
  const configuredRoot = process.env.LOCAL_RESOURCE_STORAGE_PATH?.trim();
  const roots = [
    ...new Set(
      [
        resolve(process.cwd(), "storage", "resources"),
        configuredRoot ? resolve(process.cwd(), configuredRoot) : null,
      ].filter((value): value is string => Boolean(value)),
    ),
  ];

  for (const root of roots) {
    try {
      const buffer = await readFile(join(root, objectKey));
      if (buffer.subarray(0, 4).equals(Buffer.from("%PDF"))) return buffer;
    } catch {
      // Try the next local storage root.
    }
  }

  throw new Error(`Local PDF is missing for ${objectKey}.`);
}

async function main() {
  const connectionString = requiredEnv("DATABASE_URL");
  const s3 = new S3ResourceStorageProvider({
    endpoint: requiredEnv("S3_ENDPOINT"),
    region: requiredEnv("S3_REGION"),
    bucket: requiredEnv("S3_BUCKET"),
    accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY"),
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "false").toLowerCase() === "true",
  });

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const resources = await prisma.resource.findMany({
      where: {
        title: { endsWith: "Foundation Notes" },
        format: "PDF",
        status: "PUBLISHED",
        chapter: {
          boardClassSubject: {
            board: { slug: "cbse" },
            classLevel: { slug: "class-10" },
            subject: { slug: "science" },
          },
        },
      },
      select: {
        id: true,
        title: true,
        chapter: { select: { slug: true } },
        activeAsset: {
          select: { id: true, provider: true, objectKey: true, sizeBytes: true },
        },
      },
      orderBy: { title: "asc" },
    });

    if (resources.length === 0) {
      throw new Error("No Class 10 Science foundation notes were found.");
    }

    for (const resource of resources) {
      const asset = resource.activeAsset;
      if (!asset) throw new Error(`No active asset for ${resource.id}.`);

      const buffer = await readLocalAsset(asset.objectKey);
      await s3.upload({
        objectKey: asset.objectKey,
        originalFileName: `${resource.chapter.slug}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: buffer.length,
        buffer,
      });

      const stored = await s3.headObject(asset.objectKey);
      if (!stored || stored.sizeBytes !== buffer.length) {
        throw new Error(`S3 object size mismatch for ${resource.id}.`);
      }

      if (asset.provider !== "s3") {
        await prisma.resourceAsset.update({
          where: { id: asset.id },
          data: { provider: "s3" },
        });
      }

      console.log(`uploaded ${resource.chapter.slug} ${resource.id} ${buffer.length}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  import("dotenv/config")
    .then(() => main())
    .catch(() => {
      console.error("Class 10 foundation notes S3 upload failed.");
      process.exitCode = 1;
    });
}
