-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('WEAPON', 'ARMOR', 'SHIP_COMPONENT', 'CONSUMABLE', 'AMMO', 'ATTACHMENT', 'CONTAINER', 'MISC');

-- CreateEnum
CREATE TYPE "InventoryKind" AS ENUM ('UNIQUE', 'FUNGIBLE');

-- CreateEnum
CREATE TYPE "HoldingState" AS ENUM ('ACTIVE', 'LOST', 'DESTROYED', 'RETIRED');

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "category" "InventoryCategory" NOT NULL DEFAULT 'MISC',
    "kind" "InventoryKind" NOT NULL DEFAULT 'UNIQUE',
    "description" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_holdings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "custodian_membership_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "state" "HoldingState" NOT NULL DEFAULT 'ACTIVE',
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_holdings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_items_tenant_id_category_idx" ON "inventory_items"("tenant_id", "category");

-- CreateIndex
CREATE INDEX "inventory_items_tenant_id_name_idx" ON "inventory_items"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "inventory_holdings_tenant_id_item_id_idx" ON "inventory_holdings"("tenant_id", "item_id");

-- CreateIndex
CREATE INDEX "inventory_holdings_tenant_id_state_idx" ON "inventory_holdings"("tenant_id", "state");

-- AddForeignKey
ALTER TABLE "inventory_holdings" ADD CONSTRAINT "inventory_holdings_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_holdings" ADD CONSTRAINT "inventory_holdings_custodian_membership_id_fkey" FOREIGN KEY ("custodian_membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
