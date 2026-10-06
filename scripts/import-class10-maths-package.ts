import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

import { S3ResourceStorageProvider } from "../lib/resources/s3-storage-provider";

const CHAPTERS = [
  { chapterSlug: "real-numbers", title: "Real Numbers – Notes", fileName: "01-real-numbers.pdf", pageCount: 12 },
  { chapterSlug: "polynomials", title: "Polynomials – Notes", fileName: "02-polynomials.pdf", pageCount: 10 },
  { chapterSlug: "pair-of-linear-equations-in-two-variables", title: "Pair of Linear Equations in Two Variables – Notes", fileName: "03-pair-of-linear-equations-in-two-variables.pdf", pageCount: 8 },
  { chapterSlug: "triangles", title: "Triangles – Notes", fileName: "04-triangles.pdf", pageCount: 16 },
  { chapterSlug: "introduction-to-trigonometry", title: "Introduction to Trigonometry – Notes", fileName: "05-introduction-to-trigonometry.pdf", pageCount: 12 },
  { chapterSlug: "statistics", title: "Statistics – Notes", fileName: "06-statistics.pdf", pageCount: 18 },
  { chapterSlug: "arithmetic-progressions", title: "Arithmetic Progressions – Notes", fileName: "07-arithmetic-progressions.pdf", pageCount: 16 },
  { chapterSlug: "quadratic-equations", title: "Quadratic Equations – Notes", fileName: "08-quadratic-equations.pdf", pageCount: 18 },
  { chapterSlug: "circles", title: "Circles – Notes", fileName: "09-circles.pdf", pageCount: 18 },
  { chapterSlug: "areas-related-to-circles", title: "Areas Related to Circles – Notes", fileName: "10-areas-related-to-circles.pdf", pageCount: 20 },
  { chapterSlug: "applications-of-trigonometry", title: "Applications of Trigonometry – Notes", fileName: "11-applications-of-trigonometry.pdf", pageCount: 8 },
  { chapterSlug: "surface-areas-and-volumes", title: "Surface Areas and Volumes – Notes", fileName: "12-surface-areas-and-volumes.pdf", pageCount: 20 },
  { chapterSlug: "coordinate-geometry", title: "Coordinate Geometry – Notes", fileName: "13-coordinate-geometry.pdf", pageCount: 20 },
  { chapterSlug: "probability", title: "Probability – Notes", fileName: "14-probability.pdf", pageCount: 12 },
] as const;

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
  const importDir = resolve(process.cwd(), "storage", "imports", "class-10-maths-package");
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
  try {
    const [board, classLevel, subject, notesType, admin] = await Promise.all([
      prisma.board.findFirst({ where: { slug: "cbse", isActive: true }, select: { id: true } }),
      prisma.classLevel.findFirst({ where: { slug: "class-10", isActive: true }, select: { id: true } }),
      prisma.subject.findFirst({ where: { slug: "mathematics", isActive: true }, select: { id: true } }),
      prisma.resourceType.findFirst({ where: { code: "NOTES", isActive: true }, select: { id: true } }),
      prisma.user.findFirst({
        where: { status: "ACTIVE", roles: { some: { role: { name: "ADMIN" } } } },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    if (!board || !classLevel || !subject || !notesType) {
      throw new Error("CBSE Class 10 Mathematics or Notes type is missing.");
    }

    const mapping = await prisma.boardClassSubject.findUnique({
      where: {
        boardId_classLevelId_subjectId: {
          boardId: board.id,
          classLevelId: classLevel.id,
          subjectId: subject.id,
        },
      },
      select: { id: true },
    });
    if (!mapping) throw new Error("CBSE Class 10 Mathematics mapping is missing.");

    for (const chapter of CHAPTERS) {
      const chapterRow = await prisma.chapter.findFirst({
        where: { boardClassSubjectId: mapping.id, slug: chapter.chapterSlug, isActive: true },
        select: { id: true, name: true },
      });
      if (!chapterRow) throw new Error(`Chapter ${chapter.chapterSlug} was not found.`);

      const slug = slugify(chapter.title);
      const buffer = await readFile(join(importDir, chapter.fileName));
      if (!buffer.subarray(0, 4).equals(Buffer.from("%PDF"))) {
        throw new Error(`${chapter.fileName} is not a PDF.`);
      }

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
            title: chapter.title,
            slug,
            description: `Class 10 mathematics notes for ${chapterRow.name}.`,
            language: "ENGLISH",
            format: "PDF",
            access: "FREE",
            status: "DRAFT",
            pageCount: chapter.pageCount,
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
        originalFileName: chapter.fileName,
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
            originalFileName: chapter.fileName,
            mimeType: "application/pdf",
            sizeBytes: BigInt(buffer.length),
            checksum: createHash("sha256").update(buffer).digest("hex"),
            status: "READY",
            assetVersion: 1,
            pageCount: chapter.pageCount,
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
            pageCount: chapter.pageCount,
            status: "READY",
          },
        });
      }

      await prisma.resource.update({
        where: { id: resourceId },
        data: {
          activeAssetId: assetId,
          fileSizeBytes: BigInt(buffer.length),
          pageCount: chapter.pageCount,
          status: "PUBLISHED",
          publishedAt: now,
          reviewedAt: now,
          reviewedByUserId: admin?.id ?? null,
        },
      });

      console.log(`published ${chapter.chapterSlug} ${resourceId}`);
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
      console.error("Class 10 maths package import failed.");
      process.exitCode = 1;
    });
}
