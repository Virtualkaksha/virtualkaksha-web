import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after } from "node:test";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/app/generated/prisma/client";
import { buildBoardClassSubjectWhere } from "@/lib/resources/resource-catalog-query";

if (!process.env.DATABASE_URL) {
  process.loadEnvFile(".env");
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required for resource catalogue tests.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

after(async () => {
  await prisma.$disconnect();
});

test("track route renders a class catalogue without reading a level or subjects", async () => {
  const source = await readFile(
    "app/student/resources/[track]/page.tsx",
    "utf8",
  );

  assert.match(source, /params:\s*Promise<\{[\s\S]*?track: string;[\s\S]*?\}>/);
  assert.match(source, /getBoardClassCatalog\(track\)/);
  assert.match(source, /catalog\.classes\.map/);
  assert.match(source, /Choose your class/);
  assert.doesNotMatch(source, /getClassSubjectCatalog/);
  assert.doesNotMatch(source, /catalog\.subjects/);
  assert.doesNotMatch(source, /\blevel\b/);
  assert.doesNotMatch(source, /Mathematics/);
});

test("class-subject predicate fails closed for empty or undefined class slugs", () => {
  assert.equal(buildBoardClassSubjectWhere("cbse", undefined), null);
  assert.equal(buildBoardClassSubjectWhere("cbse", ""), null);
  assert.equal(buildBoardClassSubjectWhere("cbse", "   "), null);

  const where = buildBoardClassSubjectWhere("cbse", " class-6 ");
  assert.deepEqual(where, {
    isActive: true,
    board: { slug: "cbse", isActive: true },
    classLevel: { slug: "class-6", isActive: true },
    subject: { isActive: true },
  });
});

test("CBSE track exposes Class 6 through Class 12 once each", async () => {
  const board = await prisma.board.findFirst({
    where: { slug: "cbse", isActive: true },
    select: {
      boardClassSubjects: {
        where: {
          isActive: true,
          classLevel: { isActive: true },
          subject: { isActive: true },
        },
        select: {
          classLevel: {
            select: { name: true, slug: true, numericLevel: true },
          },
        },
      },
    },
  });

  assert.ok(board);
  const classes = Array.from(
    new Map(
      board.boardClassSubjects.map(({ classLevel }) => [
        classLevel.slug,
        classLevel,
      ]),
    ).values(),
  ).sort((a, b) => a.numericLevel - b.numericLevel);

  assert.deepEqual(
    classes.map(({ name }) => name),
    ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"],
  );
  assert.deepEqual(
    classes.map(({ slug }) => `/student/resources/cbse/${slug}`),
    [6, 7, 8, 9, 10, 11, 12].map(
      (level) => `/student/resources/cbse/class-${level}`,
    ),
  );
});

test("Class 6 query returns only Class 6 subjects and Mathematics once", async () => {
  const where = buildBoardClassSubjectWhere("cbse", "class-6");
  assert.ok(where);

  const rows = await prisma.boardClassSubject.findMany({
    where,
    select: {
      classLevel: { select: { slug: true } },
      subject: { select: { slug: true } },
      _count: {
        select: { chapters: { where: { isActive: true } } },
      },
    },
  });

  assert.ok(rows.length > 0);
  assert.ok(rows.every((row) => row.classLevel.slug === "class-6"));
  const mathematics = rows.filter(
    (row) => row.subject.slug === "mathematics",
  );
  assert.equal(mathematics.length, 1);
  assert.equal(mathematics[0]._count.chapters, 0);
  assert.equal(
    `/student/resources/cbse/${mathematics[0].classLevel.slug}/${mathematics[0].subject.slug}`,
    "/student/resources/cbse/class-6/mathematics",
  );
});

test("Class 10 Mathematics returns unique published resources with canonical links", async () => {
  const where = buildBoardClassSubjectWhere("cbse", "class-10");
  assert.ok(where);

  const mathematicsMappings = await prisma.boardClassSubject.findMany({
    where: { AND: [where, { subject: { slug: "mathematics" } }] },
    select: {
      board: { select: { slug: true } },
      classLevel: { select: { slug: true } },
      subject: { select: { slug: true } },
      _count: {
        select: { chapters: { where: { isActive: true } } },
      },
      chapters: {
        where: { isActive: true },
        select: {
          slug: true,
          resources: {
            where: { status: "PUBLISHED" },
            select: { id: true, slug: true, status: true },
          },
        },
      },
    },
  });

  assert.equal(mathematicsMappings.length, 1);
  const mathematics = mathematicsMappings[0];
  assert.equal(mathematics._count.chapters, 14);
  assert.equal(mathematics.board.slug, "cbse");
  assert.equal(mathematics.classLevel.slug, "class-10");
  assert.equal(mathematics.subject.slug, "mathematics");

  const publishedResources = mathematics.chapters.flatMap((chapter) =>
    chapter.resources.map((resource) => ({ ...resource, chapterSlug: chapter.slug })),
  );
  assert.ok(publishedResources.length > 0);
  assert.ok(publishedResources.every((resource) => resource.status === "PUBLISHED"));
  assert.equal(
    new Set(publishedResources.map((resource) => resource.id)).size,
    publishedResources.length,
  );
  assert.ok(
    publishedResources.every(
      (resource) =>
        `/student/resources/${mathematics.board.slug}/${mathematics.classLevel.slug}/${mathematics.subject.slug}/${resource.chapterSlug}/${resource.slug}`
        === `/student/resources/cbse/class-10/mathematics/${resource.chapterSlug}/${resource.slug}`,
    ),
  );
  assert.equal(
    `/student/resources/${mathematics.board.slug}/${mathematics.classLevel.slug}/${mathematics.subject.slug}`,
    "/student/resources/cbse/class-10/mathematics",
  );
});

test("unknown boards and classes return no active catalogue records", async () => {
  const unknownBoard = await prisma.board.findFirst({
    where: { slug: "unknown-board", isActive: true },
    select: { id: true },
  });
  const unknownClassWhere = buildBoardClassSubjectWhere(
    "cbse",
    "unknown-class",
  );
  assert.ok(unknownClassWhere);
  const unknownClass = await prisma.boardClassSubject.findMany({
    where: unknownClassWhere,
    select: { id: true },
  });

  assert.equal(unknownBoard, null);
  assert.deepEqual(unknownClass, []);

  const repositorySource = await readFile(
    "repositories/resource-catalog.repository.ts",
    "utf8",
  );
  const trackPageSource = await readFile(
    "app/student/resources/[track]/page.tsx",
    "utf8",
  );
  const classPageSource = await readFile(
    "app/student/resources/[track]/[level]/page.tsx",
    "utf8",
  );

  assert.match(repositorySource, /if \(!where\) \{[\s\S]*?return Promise\.resolve\(\[\]\)/);
  assert.match(trackPageSource, /if \(!catalog\) \{[\s\S]*?notFound\(\)/);
  assert.match(classPageSource, /if \(!catalog\) notFound\(\)/);
});
