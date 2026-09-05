-- CreateEnum
CREATE TYPE "TeacherAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "TeacherAccessRequest" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "subjects" TEXT NOT NULL,
    "experienceYears" INTEGER,
    "message" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" "TeacherAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherAccessRequest_status_createdAt_idx" ON "TeacherAccessRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TeacherAccessRequest_email_idx" ON "TeacherAccessRequest"("email");

-- CreateIndex
CREATE INDEX "TeacherAccessRequest_reviewedByUserId_idx" ON "TeacherAccessRequest"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "TeacherAccessRequest_createdUserId_idx" ON "TeacherAccessRequest"("createdUserId");

-- AddForeignKey
ALTER TABLE "TeacherAccessRequest" ADD CONSTRAINT "TeacherAccessRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAccessRequest" ADD CONSTRAINT "TeacherAccessRequest_createdUserId_fkey" FOREIGN KEY ("createdUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
