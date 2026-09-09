-- CreateEnum
CREATE TYPE "PracticeTestKind" AS ENUM ('CHAPTER', 'COMBINED_CHAPTER', 'SUBJECT', 'FULL_CLASS');

-- CreateEnum
CREATE TYPE "PracticeTestAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');

-- CreateTable
CREATE TABLE "PracticeQuestion" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "reviewedByUserId" TEXT,
    "prompt" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correctOption" INTEGER NOT NULL,
    "explanation" TEXT,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "moderationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeTestAttempt" (
    "id" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "kind" "PracticeTestKind" NOT NULL,
    "boardId" TEXT NOT NULL,
    "classLevelId" TEXT NOT NULL,
    "subjectId" TEXT,
    "status" "PracticeTestAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "scoreCorrect" INTEGER NOT NULL DEFAULT 0,
    "scoreTotal" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeTestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeTestAttemptChapter" (
    "attemptId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,

    CONSTRAINT "PracticeTestAttemptChapter_pkey" PRIMARY KEY ("attemptId","chapterId")
);

-- CreateTable
CREATE TABLE "PracticeTestAttemptItem" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correctOption" INTEGER NOT NULL,
    "selectedOption" INTEGER,

    CONSTRAINT "PracticeTestAttemptItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeQuestion_chapterId_status_idx" ON "PracticeQuestion"("chapterId", "status");

-- CreateIndex
CREATE INDEX "PracticeQuestion_createdByUserId_idx" ON "PracticeQuestion"("createdByUserId");

-- CreateIndex
CREATE INDEX "PracticeQuestion_reviewedByUserId_idx" ON "PracticeQuestion"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "PracticeQuestion_status_idx" ON "PracticeQuestion"("status");

-- CreateIndex
CREATE INDEX "PracticeTestAttempt_studentUserId_status_startedAt_idx" ON "PracticeTestAttempt"("studentUserId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "PracticeTestAttempt_boardId_idx" ON "PracticeTestAttempt"("boardId");

-- CreateIndex
CREATE INDEX "PracticeTestAttempt_classLevelId_idx" ON "PracticeTestAttempt"("classLevelId");

-- CreateIndex
CREATE INDEX "PracticeTestAttempt_subjectId_idx" ON "PracticeTestAttempt"("subjectId");

-- CreateIndex
CREATE INDEX "PracticeTestAttemptChapter_chapterId_idx" ON "PracticeTestAttemptChapter"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeTestAttemptItem_attemptId_sortOrder_key" ON "PracticeTestAttemptItem"("attemptId", "sortOrder");

-- CreateIndex
CREATE INDEX "PracticeTestAttemptItem_attemptId_idx" ON "PracticeTestAttemptItem"("attemptId");

-- CreateIndex
CREATE INDEX "PracticeTestAttemptItem_questionId_idx" ON "PracticeTestAttemptItem"("questionId");

-- AddForeignKey
ALTER TABLE "PracticeQuestion" ADD CONSTRAINT "PracticeQuestion_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeQuestion" ADD CONSTRAINT "PracticeQuestion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeQuestion" ADD CONSTRAINT "PracticeQuestion_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTestAttempt" ADD CONSTRAINT "PracticeTestAttempt_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTestAttempt" ADD CONSTRAINT "PracticeTestAttempt_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTestAttempt" ADD CONSTRAINT "PracticeTestAttempt_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "ClassLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTestAttempt" ADD CONSTRAINT "PracticeTestAttempt_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTestAttemptChapter" ADD CONSTRAINT "PracticeTestAttemptChapter_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PracticeTestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTestAttemptChapter" ADD CONSTRAINT "PracticeTestAttemptChapter_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTestAttemptItem" ADD CONSTRAINT "PracticeTestAttemptItem_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PracticeTestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTestAttemptItem" ADD CONSTRAINT "PracticeTestAttemptItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PracticeQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
