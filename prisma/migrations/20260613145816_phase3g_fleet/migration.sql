-- CreateTable
CREATE TABLE "fleet_ships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "owner_membership_id" TEXT NOT NULL,
    "shipName" VARCHAR(160) NOT NULL,
    "manufacturer" VARCHAR(120),
    "imageUrl" VARCHAR(500),
    "notes" VARCHAR(500),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_ships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fleet_ships_tenant_id_is_public_idx" ON "fleet_ships"("tenant_id", "is_public");

-- CreateIndex
CREATE INDEX "fleet_ships_tenant_id_owner_membership_id_idx" ON "fleet_ships"("tenant_id", "owner_membership_id");

-- AddForeignKey
ALTER TABLE "fleet_ships" ADD CONSTRAINT "fleet_ships_owner_membership_id_fkey" FOREIGN KEY ("owner_membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
