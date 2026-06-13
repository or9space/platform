-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETE');

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(2000),
    "format" VARCHAR(80),
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "starts_at" TIMESTAMP(3),
    "created_by_membership_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "participant_membership_id" TEXT,
    "displayName" VARCHAR(120) NOT NULL,
    "seed" INTEGER,
    "placement" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tournaments_tenant_id_status_idx" ON "tournaments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "tournament_entries_tenant_id_tournament_id_idx" ON "tournament_entries"("tenant_id", "tournament_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_entries_tournament_id_participant_membership_id_key" ON "tournament_entries"("tournament_id", "participant_membership_id");

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_participant_membership_id_fkey" FOREIGN KEY ("participant_membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
