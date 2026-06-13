-- CreateEnum
CREATE TYPE "TreasuryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TreasuryCategory" AS ENUM ('MINING', 'TRADING', 'BOUNTY', 'SALVAGE', 'DONATION', 'PURCHASE', 'PAYOUT', 'EVENT', 'OTHER');

-- CreateTable
CREATE TABLE "treasury_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "author_membership_id" TEXT NOT NULL,
    "type" "TreasuryType" NOT NULL,
    "category" "TreasuryCategory" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treasury_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "treasury_entries_tenant_id_created_at_idx" ON "treasury_entries"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "treasury_entries_tenant_id_type_idx" ON "treasury_entries"("tenant_id", "type");

-- AddForeignKey
ALTER TABLE "treasury_entries" ADD CONSTRAINT "treasury_entries_author_membership_id_fkey" FOREIGN KEY ("author_membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
