-- CreateEnum
CREATE TYPE "ResourceAssetStatus" AS ENUM ('UPLOADING', 'READY', 'FAILED', 'DELETED');

-- CreateTable
CREATE TABLE "ResourceAsset" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksum" TEXT,
    "status" "ResourceAssetStatus" NOT NULL DEFAULT 'UPLOADING',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceAsset_resourceId_idx" ON "ResourceAsset"("resourceId");

-- CreateIndex
CREATE INDEX "ResourceAsset_status_idx" ON "ResourceAsset"("status");

-- CreateIndex
CREATE INDEX "ResourceAsset_isPrimary_idx" ON "ResourceAsset"("isPrimary");

-- CreateIndex
CREATE INDEX "ResourceAsset_provider_idx" ON "ResourceAsset"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceAsset_provider_objectKey_key" ON "ResourceAsset"("provider", "objectKey");

-- AddForeignKey
ALTER TABLE "ResourceAsset" ADD CONSTRAINT "ResourceAsset_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
