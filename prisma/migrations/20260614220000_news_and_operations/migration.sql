-- CreateEnum
CREATE TYPE "NewsCategory" AS ENUM ('ANNOUNCEMENT', 'PATCH_NOTES', 'COMMUNITY', 'GUIDE');

-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('PLANNING', 'BRIEFING', 'ACTIVE', 'DEBRIEFING', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "news_posts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "category" "NewsCategory" NOT NULL DEFAULT 'ANNOUNCEMENT',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "author_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "status" "OperationStatus" NOT NULL DEFAULT 'PLANNING',
    "scheduled_at" TIMESTAMP(3),
    "location" VARCHAR(200),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_signups" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "operation_id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "role" VARCHAR(80),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_signups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "news_posts_tenant_id_created_at_idx" ON "news_posts"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "operations_tenant_id_status_idx" ON "operations"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "operation_signups_tenant_id_idx" ON "operation_signups"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "operation_signups_operation_id_membership_id_key" ON "operation_signups"("operation_id", "membership_id");

-- AddForeignKey
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_signups" ADD CONSTRAINT "operation_signups_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_signups" ADD CONSTRAINT "operation_signups_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
