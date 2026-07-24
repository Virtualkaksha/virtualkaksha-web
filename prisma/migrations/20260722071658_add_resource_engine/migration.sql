-- CreateEnum
CREATE TYPE "ResourceFormat" AS ENUM ('PDF', 'VIDEO', 'ARTICLE', 'IMAGE', 'DOCUMENT', 'EXTERNAL_LINK', 'INTERACTIVE');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ResourceAccess" AS ENUM ('FREE', 'PREMIUM', 'ENROLLED_ONLY');

-- CreateEnum
CREATE TYPE "LearningProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "ResourceType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHindi" TEXT,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "iconName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "resourceTypeId" TEXT NOT NULL,
    "chapterId" TEXT,
    "examTopicId" TEXT,
    "createdByUserId" TEXT,
    "title" TEXT NOT NULL,
    "titleHindi" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "language" "ContentLanguage" NOT NULL DEFAULT 'ENGLISH',
    "format" "ResourceFormat" NOT NULL,
    "access" "ResourceAccess" NOT NULL DEFAULT 'FREE',
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "contentUrl" TEXT,
    "externalUrl" TEXT,
    "thumbnailUrl" TEXT,
    "textContent" TEXT,
    "durationSeconds" INTEGER,
    "pageCount" INTEGER,
    "fileSizeBytes" BIGINT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceTeacher" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "teacherProfileId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceBookmark" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentResourceProgress" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "status" "LearningProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "lastPosition" INTEGER,
    "startedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentResourceProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceType_code_key" ON "ResourceType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceType_slug_key" ON "ResourceType"("slug");

-- CreateIndex
CREATE INDEX "ResourceType_isActive_idx" ON "ResourceType"("isActive");

-- CreateIndex
CREATE INDEX "ResourceType_sortOrder_idx" ON "ResourceType"("sortOrder");

-- CreateIndex
CREATE INDEX "Resource_resourceTypeId_idx" ON "Resource"("resourceTypeId");

-- CreateIndex
CREATE INDEX "Resource_chapterId_idx" ON "Resource"("chapterId");

-- CreateIndex
CREATE INDEX "Resource_examTopicId_idx" ON "Resource"("examTopicId");

-- CreateIndex
CREATE INDEX "Resource_createdByUserId_idx" ON "Resource"("createdByUserId");

-- CreateIndex
CREATE INDEX "Resource_status_idx" ON "Resource"("status");

-- CreateIndex
CREATE INDEX "Resource_access_idx" ON "Resource"("access");

-- CreateIndex
CREATE INDEX "Resource_language_idx" ON "Resource"("language");

-- CreateIndex
CREATE INDEX "Resource_format_idx" ON "Resource"("format");

-- CreateIndex
CREATE INDEX "Resource_isFeatured_idx" ON "Resource"("isFeatured");

-- CreateIndex
CREATE INDEX "Resource_sortOrder_idx" ON "Resource"("sortOrder");

-- CreateIndex
CREATE INDEX "Resource_publishedAt_idx" ON "Resource"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_chapterId_slug_key" ON "Resource"("chapterId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_examTopicId_slug_key" ON "Resource"("examTopicId", "slug");

-- CreateIndex
CREATE INDEX "ResourceTeacher_resourceId_idx" ON "ResourceTeacher"("resourceId");

-- CreateIndex
CREATE INDEX "ResourceTeacher_teacherProfileId_idx" ON "ResourceTeacher"("teacherProfileId");

-- CreateIndex
CREATE INDEX "ResourceTeacher_isPrimary_idx" ON "ResourceTeacher"("isPrimary");

-- CreateIndex
CREATE INDEX "ResourceTeacher_displayOrder_idx" ON "ResourceTeacher"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceTeacher_resourceId_teacherProfileId_key" ON "ResourceTeacher"("resourceId", "teacherProfileId");

-- CreateIndex
CREATE INDEX "ResourceBookmark_studentProfileId_idx" ON "ResourceBookmark"("studentProfileId");

-- CreateIndex
CREATE INDEX "ResourceBookmark_resourceId_idx" ON "ResourceBookmark"("resourceId");

-- CreateIndex
CREATE INDEX "ResourceBookmark_createdAt_idx" ON "ResourceBookmark"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceBookmark_studentProfileId_resourceId_key" ON "ResourceBookmark"("studentProfileId", "resourceId");

-- CreateIndex
CREATE INDEX "StudentResourceProgress_studentProfileId_idx" ON "StudentResourceProgress"("studentProfileId");

-- CreateIndex
CREATE INDEX "StudentResourceProgress_resourceId_idx" ON "StudentResourceProgress"("resourceId");

-- CreateIndex
CREATE INDEX "StudentResourceProgress_status_idx" ON "StudentResourceProgress"("status");

-- CreateIndex
CREATE INDEX "StudentResourceProgress_lastAccessedAt_idx" ON "StudentResourceProgress"("lastAccessedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudentResourceProgress_studentProfileId_resourceId_key" ON "StudentResourceProgress"("studentProfileId", "resourceId");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_resourceTypeId_fkey" FOREIGN KEY ("resourceTypeId") REFERENCES "ResourceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_examTopicId_fkey" FOREIGN KEY ("examTopicId") REFERENCES "ExamTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceTeacher" ADD CONSTRAINT "ResourceTeacher_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceTeacher" ADD CONSTRAINT "ResourceTeacher_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceBookmark" ADD CONSTRAINT "ResourceBookmark_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceBookmark" ADD CONSTRAINT "ResourceBookmark_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResourceProgress" ADD CONSTRAINT "StudentResourceProgress_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResourceProgress" ADD CONSTRAINT "StudentResourceProgress_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
