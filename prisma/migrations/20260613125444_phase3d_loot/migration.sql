-- CreateEnum
CREATE TYPE "LootAttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT');

-- CreateEnum
CREATE TYPE "LootTxnType" AS ENUM ('SPEND', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUST');

-- CreateTable
CREATE TABLE "loot_members" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "membership_id" TEXT,
    "displayName" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loot_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loot_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "label" VARCHAR(160) NOT NULL,
    "session_date" TIMESTAMP(3) NOT NULL,
    "notes" VARCHAR(500),
    "created_by_membership_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loot_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loot_attendance" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "status" "LootAttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loot_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loot_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "amount_tenths" INTEGER NOT NULL,
    "type" "LootTxnType" NOT NULL,
    "note" VARCHAR(500),
    "related_member_id" TEXT,
    "created_by_membership_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loot_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loot_members_tenant_id_idx" ON "loot_members"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "loot_members_tenant_id_membership_id_key" ON "loot_members"("tenant_id", "membership_id");

-- CreateIndex
CREATE INDEX "loot_sessions_tenant_id_session_date_idx" ON "loot_sessions"("tenant_id", "session_date");

-- CreateIndex
CREATE INDEX "loot_attendance_tenant_id_member_id_idx" ON "loot_attendance"("tenant_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "loot_attendance_session_id_member_id_key" ON "loot_attendance"("session_id", "member_id");

-- CreateIndex
CREATE INDEX "loot_transactions_tenant_id_member_id_created_at_idx" ON "loot_transactions"("tenant_id", "member_id", "created_at");

-- AddForeignKey
ALTER TABLE "loot_members" ADD CONSTRAINT "loot_members_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loot_attendance" ADD CONSTRAINT "loot_attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "loot_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loot_attendance" ADD CONSTRAINT "loot_attendance_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "loot_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loot_transactions" ADD CONSTRAINT "loot_transactions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "loot_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loot_transactions" ADD CONSTRAINT "loot_transactions_related_member_id_fkey" FOREIGN KEY ("related_member_id") REFERENCES "loot_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
