/*
  Warnings:

  - You are about to drop the column `board` on the `StudentProfile` table. All the data in the column will be lost.
  - You are about to drop the column `currentClass` on the `StudentProfile` table. All the data in the column will be lost.
  - The `preferredLanguage` column on the `StudentProfile` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "BoardType" AS ENUM ('NATIONAL', 'STATE');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('JEE', 'NEET', 'CUET');

-- CreateEnum
CREATE TYPE "ContentLanguage" AS ENUM ('ENGLISH', 'HINDI');

-- DropIndex
DROP INDEX "StudentProfile_userId_idx";

-- DropIndex
DROP INDEX "TeacherProfile_userId_idx";

-- AlterTable
ALTER TABLE "StudentProfile" DROP COLUMN "board",
DROP COLUMN "currentClass",
ADD COLUMN     "boardId" TEXT,
ADD COLUMN     "classLevelId" TEXT,
DROP COLUMN "preferredLanguage",
ADD COLUMN     "preferredLanguage" "ContentLanguage" NOT NULL DEFAULT 'ENGLISH';

-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "boardType" "BoardType" NOT NULL,
    "stateName" TEXT,
    "stateCode" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "numericLevel" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHindi" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardClassSubject" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "classLevelId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardClassSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "boardClassSubjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHindi" TEXT,
    "slug" TEXT NOT NULL,
    "chapterNumber" INTEGER,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "examType" "ExamType" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSubject" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamTopic" (
    "id" TEXT NOT NULL,
    "examSubjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHindi" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Board_slug_key" ON "Board"("slug");

-- CreateIndex
CREATE INDEX "Board_boardType_idx" ON "Board"("boardType");

-- CreateIndex
CREATE INDEX "Board_stateCode_idx" ON "Board"("stateCode");

-- CreateIndex
CREATE INDEX "Board_isActive_idx" ON "Board"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Board_shortName_stateCode_key" ON "Board"("shortName", "stateCode");

-- CreateIndex
CREATE UNIQUE INDEX "ClassLevel_slug_key" ON "ClassLevel"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ClassLevel_numericLevel_key" ON "ClassLevel"("numericLevel");

-- CreateIndex
CREATE INDEX "ClassLevel_isActive_idx" ON "ClassLevel"("isActive");

-- CreateIndex
CREATE INDEX "ClassLevel_sortOrder_idx" ON "ClassLevel"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_slug_key" ON "Subject"("slug");

-- CreateIndex
CREATE INDEX "Subject_isActive_idx" ON "Subject"("isActive");

-- CreateIndex
CREATE INDEX "Subject_sortOrder_idx" ON "Subject"("sortOrder");

-- CreateIndex
CREATE INDEX "BoardClassSubject_boardId_idx" ON "BoardClassSubject"("boardId");

-- CreateIndex
CREATE INDEX "BoardClassSubject_classLevelId_idx" ON "BoardClassSubject"("classLevelId");

-- CreateIndex
CREATE INDEX "BoardClassSubject_subjectId_idx" ON "BoardClassSubject"("subjectId");

-- CreateIndex
CREATE INDEX "BoardClassSubject_isActive_idx" ON "BoardClassSubject"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BoardClassSubject_boardId_classLevelId_subjectId_key" ON "BoardClassSubject"("boardId", "classLevelId", "subjectId");

-- CreateIndex
CREATE INDEX "Chapter_boardClassSubjectId_idx" ON "Chapter"("boardClassSubjectId");

-- CreateIndex
CREATE INDEX "Chapter_chapterNumber_idx" ON "Chapter"("chapterNumber");

-- CreateIndex
CREATE INDEX "Chapter_isActive_idx" ON "Chapter"("isActive");

-- CreateIndex
CREATE INDEX "Chapter_sortOrder_idx" ON "Chapter"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_boardClassSubjectId_slug_key" ON "Chapter"("boardClassSubjectId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_shortName_key" ON "Exam"("shortName");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_slug_key" ON "Exam"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_examType_key" ON "Exam"("examType");

-- CreateIndex
CREATE INDEX "Exam_isActive_idx" ON "Exam"("isActive");

-- CreateIndex
CREATE INDEX "Exam_sortOrder_idx" ON "Exam"("sortOrder");

-- CreateIndex
CREATE INDEX "ExamSubject_examId_idx" ON "ExamSubject"("examId");

-- CreateIndex
CREATE INDEX "ExamSubject_subjectId_idx" ON "ExamSubject"("subjectId");

-- CreateIndex
CREATE INDEX "ExamSubject_isActive_idx" ON "ExamSubject"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSubject_examId_subjectId_key" ON "ExamSubject"("examId", "subjectId");

-- CreateIndex
CREATE INDEX "ExamTopic_examSubjectId_idx" ON "ExamTopic"("examSubjectId");

-- CreateIndex
CREATE INDEX "ExamTopic_isActive_idx" ON "ExamTopic"("isActive");

-- CreateIndex
CREATE INDEX "ExamTopic_sortOrder_idx" ON "ExamTopic"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ExamTopic_examSubjectId_slug_key" ON "ExamTopic"("examSubjectId", "slug");

-- CreateIndex
CREATE INDEX "StudentProfile_boardId_idx" ON "StudentProfile"("boardId");

-- CreateIndex
CREATE INDEX "StudentProfile_classLevelId_idx" ON "StudentProfile"("classLevelId");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "ClassLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardClassSubject" ADD CONSTRAINT "BoardClassSubject_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardClassSubject" ADD CONSTRAINT "BoardClassSubject_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "ClassLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardClassSubject" ADD CONSTRAINT "BoardClassSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_boardClassSubjectId_fkey" FOREIGN KEY ("boardClassSubjectId") REFERENCES "BoardClassSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTopic" ADD CONSTRAINT "ExamTopic_examSubjectId_fkey" FOREIGN KEY ("examSubjectId") REFERENCES "ExamSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
