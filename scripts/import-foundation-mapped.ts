import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

import { S3ResourceStorageProvider } from "../lib/resources/s3-storage-provider";

type ManifestItem = {
  classSlug: string;
  subjectSlug: string;
  chapterSlug: string;
  title: string;
  file: string;
  pageCount: number;
};

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is missing.`);
  return value;
}

async function main() {
  const connectionString = requiredEnv("DATABASE_URL");
  const importRoot = resolve(process.cwd(), "storage", "imports", "foundation-mapped");
  const manifest = JSON.parse(await readFile(join(importRoot, "manifest.json"), "utf8")) as ManifestItem[];

  const configuredRoot = process.env.LOCAL_RESOURCE_STORAGE_PATH?.trim();
  const storageRoots = [
    ...new Set(
      [
        resolve(process.cwd(), "storage", "resources"),
        configuredRoot ? resolve(process.cwd(), configuredRoot) : null,
      ].filter((value): value is string => Boolean(value)),
    ),
  ];

  const s3 = new S3ResourceStorageProvider({
    endpoint: requiredEnv("S3_ENDPOINT"),
    region: requiredEnv("S3_REGION"),
    bucket: requiredEnv("S3_BUCKET"),
    accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY"),
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "false").toLowerCase() === "true",
  });

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const counts = { published: 0, skipped: 0 };

  try {
    const [board, notesType, admin] = await Promise.all([
      prisma.board.findFirst({ where: { slug: "cbse", isActive: true }, select: { id: true } }),
      prisma.resourceType.findFirst({ where: { code: "NOTES", isActive: true }, select: { id: true } }),
      prisma.user.findFirst({
        where: { status: "ACTIVE", roles: { some: { role: { name: "ADMIN" } } } },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    if (!board || !notesType) throw new Error("CBSE board or NOTES type is missing.");

    const classCache = new Map<string, string>();
    const subjectCache = new Map<string, string>();
    const mappingCache = new Map<string, string>();

    const getClassId = async (slug: string) => {
      const cached = classCache.get(slug);
      if (cached) return cached;
      const row = await prisma.classLevel.findFirst({ where: { slug, isActive: true }, select: { id: true } });
      if (!row) throw new Error(`Class ${slug} is missing.`);
      classCache.set(slug, row.id);
      return row.id;
    };

    const getSubjectId = async (slug: string) => {
      const cached = subjectCache.get(slug);
      if (cached) return cached;
      const row = await prisma.subject.findFirst({ where: { slug, isActive: true }, select: { id: true } });
      if (!row) throw new Error(`Subject ${slug} is missing.`);
      subjectCache.set(slug, row.id);
      return row.id;
    };

    const getMappingId = async (classSlug: string, subjectSlug: string) => {
      const key = `${classSlug}:${subjectSlug}`;
      const cached = mappingCache.get(key);
      if (cached) return cached;
      const classLevelId = await getClassId(classSlug);
      const subjectId = await getSubjectId(subjectSlug);
      const mapping = await prisma.boardClassSubject.findUnique({
        where: {
          boardId_classLevelId_subjectId: {
            boardId: board.id,
            classLevelId,
            subjectId,
          },
        },
        select: { id: true },
      });
      if (!mapping) throw new Error(`Mapping ${key} is missing.`);
      mappingCache.set(key, mapping.id);
      return mapping.id;
    };

    for (const item of manifest) {
      const mappingId = await getMappingId(item.classSlug, item.subjectSlug);
      const chapterRow = await prisma.chapter.findFirst({
        where: { boardClassSubjectId: mappingId, slug: item.chapterSlug, isActive: true },
        select: { id: true, name: true },
      });
      if (!chapterRow) {
        counts.skipped += 1;
        console.warn(`skip missing chapter ${item.classSlug}/${item.subjectSlug}/${item.chapterSlug}`);
        continue;
      }

      const fileName = item.file.split(/[/\\]/).pop() ?? "notes.pdf";
      const buffer = await readFile(join(importRoot, item.file));
      if (!buffer.subarray(0, 4).equals(Buffer.from("%PDF"))) {
        throw new Error(`${item.file} is not a PDF.`);
      }

      const slug = slugify(item.title);
      const writeLocal = async (objectKey: string) => {
        for (const storageRoot of storageRoots) {
          const targetDir = join(storageRoot, objectKey.split("/").slice(0, -1).join("/"));
          await mkdir(targetDir, { recursive: true });
          await writeFile(join(storageRoot, objectKey), buffer);
        }
      };

      const existing = await prisma.resource.findFirst({
        where: { chapterId: chapterRow.id, slug },
        select: { id: true, activeAsset: { select: { id: true, objectKey: true } } },
      });

      const now = new Date();
      let resourceId = existing?.id;
      let objectKey = existing?.activeAsset?.objectKey;
      let assetId = existing?.activeAsset?.id;

      if (!resourceId) {
        const created = await prisma.resource.create({
          data: {
            chapterId: chapterRow.id,
            resourceTypeId: notesType.id,
            createdByUserId: admin?.id ?? null,
            title: item.title,
            slug,
            description: `${item.classSlug.replace("class-", "Class ")} ${item.subjectSlug} notes for ${chapterRow.name}.`,
            language: "ENGLISH",
            format: "PDF",
            access: "FREE",
            status: "DRAFT",
            pageCount: item.pageCount,
            sortOrder: 1,
          },
          select: { id: true },
        });
        resourceId = created.id;
        objectKey = `resources/${resourceId}/${randomUUID()}.pdf`;
      }
      if (!objectKey) objectKey = `resources/${resourceId}/${randomUUID()}.pdf`;

      await writeLocal(objectKey);
      await s3.upload({
        objectKey,
        originalFileName: fileName,
        mimeType: "application/pdf",
        sizeBytes: buffer.length,
        buffer,
      });

      if (!assetId) {
        const asset = await prisma.resourceAsset.create({
          data: {
            resourceId,
            provider: "s3",
            objectKey,
            originalFileName: fileName,
            mimeType: "application/pdf",
            sizeBytes: BigInt(buffer.length),
            checksum: createHash("sha256").update(buffer).digest("hex"),
            status: "READY",
            assetVersion: 1,
            pageCount: item.pageCount,
            activatedAt: now,
            isPrimary: true,
          },
          select: { id: true },
        });
        assetId = asset.id;
      } else {
        await prisma.resourceAsset.update({
          where: { id: assetId },
          data: {
            provider: "s3",
            objectKey,
            sizeBytes: BigInt(buffer.length),
            checksum: createHash("sha256").update(buffer).digest("hex"),
            pageCount: item.pageCount,
            status: "READY",
          },
        });
      }

      await prisma.resource.update({
        where: { id: resourceId },
        data: {
          activeAssetId: assetId,
          fileSizeBytes: BigInt(buffer.length),
          pageCount: item.pageCount,
          status: "PUBLISHED",
          publishedAt: now,
          reviewedAt: now,
          reviewedByUserId: admin?.id ?? null,
        },
      });

      counts.published += 1;
      console.log(`published ${item.classSlug}/${item.subjectSlug}/${item.chapterSlug} ${resourceId}`);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(`done published=${counts.published} skipped=${counts.skipped}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  import("dotenv/config")
    .then(() => main())
    .catch((error) => {
      console.error("Foundation mapped import failed.");
      console.error(error);
      process.exitCode = 1;
    });
}
