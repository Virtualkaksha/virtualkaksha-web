-- CreateEnum
CREATE TYPE "ResourceAuditAction" AS ENUM ('ADMIN_METADATA_EDIT');

-- CreateTable
CREATE TABLE "ResourceMetadataAudit" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" "ResourceAuditAction" NOT NULL,
    "previousVersion" INTEGER NOT NULL,
    "newVersion" INTEGER NOT NULL,
    "changedFields" TEXT[],
    "beforeValues" JSONB NOT NULL,
    "afterValues" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceMetadataAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceMetadataAudit_resourceId_createdAt_idx" ON "ResourceMetadataAudit"("resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "ResourceMetadataAudit_actorUserId_createdAt_idx" ON "ResourceMetadataAudit"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ResourceMetadataAudit_action_createdAt_idx" ON "ResourceMetadataAudit"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "ResourceMetadataAudit" ADD CONSTRAINT "ResourceMetadataAudit_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceMetadataAudit" ADD CONSTRAINT "ResourceMetadataAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
