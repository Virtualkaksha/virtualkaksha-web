-- Stage C1 is additive. It does not delete assets or touch storage objects.

-- CreateEnum
CREATE TYPE "ResourceAssetAuditAction" AS ENUM (
    'LEGACY_MIGRATED',
    'PDF_REPLACED',
    'PDF_ROLLED_BACK',
    'CANDIDATE_DISCARDED'
);

-- AlterEnum
ALTER TYPE "ResourceAssetStatus" ADD VALUE 'RETIRED';
ALTER TYPE "ResourceAssetStatus" ADD VALUE 'DELETE_PENDING';

-- Add nullable foundation columns first so existing rows remain valid.
ALTER TABLE "Resource" ADD COLUMN "activeAssetId" TEXT;

ALTER TABLE "ResourceAsset"
    ADD COLUMN "activatedAt" TIMESTAMP(3),
    ADD COLUMN "assetVersion" INTEGER,
    ADD COLUMN "deleteAfter" TIMESTAMP(3),
    ADD COLUMN "deletedAt" TIMESTAMP(3),
    ADD COLUMN "pageCount" INTEGER,
    ADD COLUMN "retiredAt" TIMESTAMP(3);

ALTER TABLE "StudentResourceProgress" ADD COLUMN "assetVersion" INTEGER;

-- Deterministic per-resource versions: oldest creation timestamp, then stable ID.
WITH "rankedAssets" AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "resourceId"
            ORDER BY "createdAt" ASC, "id" ASC
        )::INTEGER AS "version"
    FROM "ResourceAsset"
)
UPDATE "ResourceAsset" AS "asset"
SET "assetVersion" = "rankedAssets"."version"
FROM "rankedAssets"
WHERE "asset"."id" = "rankedAssets"."id";

ALTER TABLE "ResourceAsset" ALTER COLUMN "assetVersion" SET NOT NULL;

-- Backfill only an unambiguous, READY transitional primary. Legacy/no-asset
-- resources and all ambiguous classifications deliberately remain NULL.
WITH "unambiguousPrimary" AS (
    SELECT "resourceId", MIN("id") AS "assetId"
    FROM "ResourceAsset"
    WHERE "status" = 'READY' AND "isPrimary" = true
    GROUP BY "resourceId"
    HAVING COUNT(*) = 1
)
UPDATE "Resource" AS "resource"
SET "activeAssetId" = "unambiguousPrimary"."assetId"
FROM "unambiguousPrimary"
WHERE "resource"."id" = "unambiguousPrimary"."resourceId";

-- CreateTable
CREATE TABLE "ResourceAssetAudit" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" "ResourceAssetAuditAction" NOT NULL,
    "fromAssetId" TEXT,
    "toAssetId" TEXT,
    "resourceVersionBefore" INTEGER NOT NULL,
    "resourceVersionAfter" INTEGER NOT NULL,
    "priorStatus" "PublicationStatus" NOT NULL,
    "resultingStatus" "PublicationStatus" NOT NULL,
    "byteIdentical" BOOLEAN NOT NULL DEFAULT false,
    "progressRowsObserved" INTEGER NOT NULL DEFAULT 0,
    "progressRowsAdjusted" INTEGER NOT NULL DEFAULT 0,
    "progressRowsClamped" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResourceAssetAudit_pkey" PRIMARY KEY ("id")
);

-- Replace the asset ownership cascade with retention-safe restriction.
ALTER TABLE "ResourceAsset" DROP CONSTRAINT "ResourceAsset_resourceId_fkey";

CREATE UNIQUE INDEX "Resource_activeAssetId_key" ON "Resource"("activeAssetId");
CREATE UNIQUE INDEX "ResourceAsset_resourceId_assetVersion_key" ON "ResourceAsset"("resourceId", "assetVersion");
CREATE INDEX "ResourceAsset_resourceId_status_idx" ON "ResourceAsset"("resourceId", "status");
CREATE INDEX "ResourceAsset_checksum_idx" ON "ResourceAsset"("checksum");
CREATE INDEX "ResourceAsset_deleteAfter_status_idx" ON "ResourceAsset"("deleteAfter", "status");
CREATE INDEX "ResourceAssetAudit_resourceId_createdAt_idx" ON "ResourceAssetAudit"("resourceId", "createdAt");
CREATE INDEX "ResourceAssetAudit_actorUserId_createdAt_idx" ON "ResourceAssetAudit"("actorUserId", "createdAt");
CREATE INDEX "ResourceAssetAudit_action_createdAt_idx" ON "ResourceAssetAudit"("action", "createdAt");

ALTER TABLE "Resource" ADD CONSTRAINT "Resource_activeAssetId_fkey"
    FOREIGN KEY ("activeAssetId") REFERENCES "ResourceAsset"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResourceAsset" ADD CONSTRAINT "ResourceAsset_resourceId_fkey"
    FOREIGN KEY ("resourceId") REFERENCES "Resource"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResourceAssetAudit" ADD CONSTRAINT "ResourceAssetAudit_resourceId_fkey"
    FOREIGN KEY ("resourceId") REFERENCES "Resource"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResourceAssetAudit" ADD CONSTRAINT "ResourceAssetAudit_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Deferred rejection-only enforcement. Application transactions may create a
-- READY asset and set the pointer in either order, but must be valid at commit.
CREATE FUNCTION "enforce_resource_active_asset"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Resource" AS "resource"
        LEFT JOIN "ResourceAsset" AS "asset"
          ON "asset"."id" = "resource"."activeAssetId"
        WHERE "resource"."activeAssetId" IS NOT NULL
          AND (
              "asset"."id" IS NULL
              OR "asset"."resourceId" <> "resource"."id"
              OR "asset"."status" <> 'READY'
          )
    ) THEN
        RAISE EXCEPTION 'active asset must be READY and belong to its resource'
          USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "Resource_activeAsset_valid"
AFTER INSERT OR UPDATE ON "Resource"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "enforce_resource_active_asset"();

CREATE CONSTRAINT TRIGGER "ResourceAsset_activeAsset_valid"
AFTER INSERT OR UPDATE OR DELETE ON "ResourceAsset"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "enforce_resource_active_asset"();
