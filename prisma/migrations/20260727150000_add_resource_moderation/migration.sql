ALTER TABLE "Resource"
ADD COLUMN "moderationNote" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedByUserId" TEXT;

CREATE INDEX "Resource_reviewedByUserId_idx" ON "Resource"("reviewedByUserId");
CREATE INDEX "Resource_reviewedAt_idx" ON "Resource"("reviewedAt");

ALTER TABLE "Resource"
ADD CONSTRAINT "Resource_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
