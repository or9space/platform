CREATE TYPE "NominationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Membership profile + availability fields
ALTER TABLE "memberships" ADD COLUMN "rsi_handle" VARCHAR(60);
ALTER TABLE "memberships" ADD COLUMN "timezone" VARCHAR(60);
ALTER TABLE "memberships" ADD COLUMN "socials" JSONB;
ALTER TABLE "memberships" ADD COLUMN "availability" JSONB;

-- Operation objectives + AAR
ALTER TABLE "operations" ADD COLUMN "objectives" JSONB;
ALTER TABLE "operations" ADD COLUMN "aar" TEXT;

-- Award nominations
CREATE TABLE "award_nominations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "award_id" TEXT NOT NULL,
    "nominee_id" TEXT NOT NULL,
    "nominator_id" TEXT NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" "NominationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "award_nominations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "award_nominations_tenant_id_award_id_idx" ON "award_nominations"("tenant_id", "award_id");
ALTER TABLE "award_nominations" ADD CONSTRAINT "award_nominations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "award_nominations" ADD CONSTRAINT "award_nominations_award_id_fkey" FOREIGN KEY ("award_id") REFERENCES "awards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "award_nominations" ADD CONSTRAINT "award_nominations_nominee_id_fkey" FOREIGN KEY ("nominee_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "award_nominations" ADD CONSTRAINT "award_nominations_nominator_id_fkey" FOREIGN KEY ("nominator_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
