-- CreateEnum
CREATE TYPE "HandbookStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "handbooks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "subtitle" VARCHAR(300),
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "HandbookStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handbook_sections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "handbook_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "handbook_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handbook_acknowledgements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "handbook_id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "version_read" INTEGER NOT NULL,
    "acknowledged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handbook_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "handbooks_tenant_id_status_idx" ON "handbooks"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "handbooks_tenant_id_slug_key" ON "handbooks"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "handbook_sections_tenant_id_handbook_id_order_index_idx" ON "handbook_sections"("tenant_id", "handbook_id", "order_index");

-- CreateIndex
CREATE INDEX "handbook_acknowledgements_tenant_id_membership_id_idx" ON "handbook_acknowledgements"("tenant_id", "membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "handbook_acknowledgements_handbook_id_membership_id_key" ON "handbook_acknowledgements"("handbook_id", "membership_id");

-- AddForeignKey
ALTER TABLE "handbook_sections" ADD CONSTRAINT "handbook_sections_handbook_id_fkey" FOREIGN KEY ("handbook_id") REFERENCES "handbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handbook_acknowledgements" ADD CONSTRAINT "handbook_acknowledgements_handbook_id_fkey" FOREIGN KEY ("handbook_id") REFERENCES "handbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handbook_acknowledgements" ADD CONSTRAINT "handbook_acknowledgements_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
