-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'TODO',
    "assignee_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_tenant_id_idx" ON "projects"("tenant_id");

-- CreateIndex
CREATE INDEX "tickets_tenant_id_project_id_idx" ON "tickets"("tenant_id", "project_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
