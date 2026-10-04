import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const CHAPTERS = [
  {
    chapterSlug: "life-processes",
    title: "Life Processes – Foundation Notes",
    fileName: "05-life-processes.pdf",
    pageCount: 40,
  },
  {
    chapterSlug: "control-and-coordination",
    title: "Control and Coordination – Foundation Notes",
    fileName: "06-control-and-coordination.pdf",
    pageCount: 26,
  },
  {
    chapterSlug: "how-do-organisms-reproduce",
    title: "How Do Organisms Reproduce? – Foundation Notes",
    fileName: "07-how-do-organisms-reproduce.pdf",
    pageCount: 24,
  },
  {
    chapterSlug: "heredity",
    title: "Heredity – Foundation Notes",
    fileName: "08-heredity.pdf",
    pageCount: 22,
  },
  {
    chapterSlug: "light-reflection-and-refraction",
    title: "Light – Reflection and Refraction – Foundation Notes",
    fileName: "09-light-reflection-and-refraction.pdf",
    pageCount: 34,
  },
  {
    chapterSlug: "human-eye-and-colourful-world",
    title: "The Human Eye and the Colourful World – Foundation Notes",
    fileName: "10-human-eye-and-colourful-world.pdf",
    pageCount: 12,
  },
  {
    chapterSlug: "electricity",
    title: "Electricity – Foundation Notes",
    fileName: "11-electricity.pdf",
    pageCount: 26,
  },
  {
    chapterSlug: "magnetic-effects-of-electric-current",
    title: "Magnetic Effects of Electric Current – Foundation Notes",
    fileName: "12-magnetic-effects-of-electric-current.pdf",
    pageCount: 18,
  },
  {
    chapterSlug: "our-environment",
    title: "Our Environment – Foundation Notes",
    fileName: "13-our-environment.pdf",
    pageCount: 12,
  },
] as const;

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is missing.");

  const importDir = resolve(process.cwd(), "storage", "imports", "class-10-science");
  const configuredRoot = process.env.LOCAL_RESOURCE_STORAGE_PATH?.trim();
  const storageRoots = [
    ...new Set(
      [
        resolve(process.cwd(), "storage", "resources"),
        configuredRoot ? resolve(process.cwd(), configuredRoot) : null,
      ].filter((value): value is string => Boolean(value)),
    ),
  ];

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const [board, classLevel, subject, notesType, admin] = await Promise.all([
      prisma.board.findFirst({ where: { slug: "cbse", isActive: true }, select: { id: true } }),
      prisma.classLevel.findFirst({ where: { slug: "class-10", isActive: true }, select: { id: true } }),
      prisma.subject.findFirst({ where: { slug: "science", isActive: true }, select: { id: true } }),
      prisma.resourceType.findFirst({ where: { code: "NOTES", isActive: true }, select: { id: true } }),
      prisma.user.findFirst({
        where: { status: "ACTIVE", roles: { some: { role: { name: "ADMIN" } } } },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!board || !classLevel || !subject || !notesType) {
      throw new Error("CBSE Class 10 Science or Notes type is missing. Run the seed first.");
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
    if (!mapping) throw new Error("CBSE Class 10 Science mapping is missing.");

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

      const writeAsset = async (objectKey: string) => {
        for (const storageRoot of storageRoots) {
          const targetDir = join(storageRoot, objectKey.split("/").slice(0, -1).join("/"));
          await mkdir(targetDir, { recursive: true });
          await writeFile(join(storageRoot, objectKey), buffer);
        }
      };

      const existing = await prisma.resource.findFirst({
        where: { chapterId: chapterRow.id, slug },
        select: {
          id: true,
          activeAsset: { select: { objectKey: true } },
        },
      });
      if (existing?.activeAsset?.objectKey) {
        await writeAsset(existing.activeAsset.objectKey);
        console.log(`restored file ${chapter.chapterSlug}`);
        continue;
      }

      const now = new Date();
      const created = await prisma.resource.create({
        data: {
          chapterId: chapterRow.id,
          resourceTypeId: notesType.id,
          createdByUserId: admin?.id ?? null,
          title: chapter.title,
          slug,
          description: `Class 10 science foundation notes for ${chapterRow.name}.`,
          language: "ENGLISH",
          format: "PDF",
          access: "FREE",
          status: "DRAFT",
          pageCount: chapter.pageCount,
          sortOrder: 1,
        },
        select: { id: true },
      });

      const objectKey = `resources/${created.id}/${randomUUID()}.pdf`;
      await writeAsset(objectKey);

      const asset = await prisma.resourceAsset.create({
        data: {
          resourceId: created.id,
          provider: "local",
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

      await prisma.resource.update({
        where: { id: created.id },
        data: {
          activeAssetId: asset.id,
          fileSizeBytes: BigInt(buffer.length),
          status: "PUBLISHED",
          publishedAt: now,
          reviewedAt: now,
          reviewedByUserId: admin?.id ?? null,
        },
      });

      console.log(`published ${chapter.chapterSlug} ${created.id}`);
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
      console.error("Class 10 science foundation import failed.");
      process.exitCode = 1;
    });
}
