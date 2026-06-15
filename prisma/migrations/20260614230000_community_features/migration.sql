-- CreateEnum
CREATE TYPE "LfgStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "AllianceStatus" AS ENUM ('ALLY', 'NEUTRAL', 'HOSTILE', 'PENDING');

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "url" VARCHAR(500),
    "body" TEXT,
    "category" VARCHAR(60),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lfg_posts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" TEXT,
    "status" "LfgStatus" NOT NULL DEFAULT 'OPEN',
    "author_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lfg_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alliances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "status" "AllianceStatus" NOT NULL DEFAULT 'ALLY',
    "link" VARCHAR(500),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alliances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resources_tenant_id_idx" ON "resources"("tenant_id");

-- CreateIndex
CREATE INDEX "lfg_posts_tenant_id_status_idx" ON "lfg_posts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "alliances_tenant_id_idx" ON "alliances"("tenant_id");

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lfg_posts" ADD CONSTRAINT "lfg_posts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lfg_posts" ADD CONSTRAINT "lfg_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alliances" ADD CONSTRAINT "alliances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alliances" ADD CONSTRAINT "alliances_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
