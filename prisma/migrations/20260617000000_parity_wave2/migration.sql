-- Enums
CREATE TYPE "ContractType" AS ENUM ('GENERAL', 'ESCORT', 'MINING', 'COMBAT', 'SALVAGE', 'TRANSPORT', 'BOUNTY', 'RECON', 'MEDICAL', 'TRADE');
CREATE TYPE "AwardKind" AS ENUM ('MEDAL', 'RIBBON', 'COMMENDATION', 'TROPHY', 'BADGE');
CREATE TYPE "CommentEntity" AS ENUM ('EVENT', 'NEWS', 'GALLERY', 'OPERATION');
CREATE TYPE "NotificationType" AS ENUM ('MESSAGE', 'AWARD', 'EVENT', 'PROMOTION', 'FORUM_REPLY', 'NEWS', 'SYSTEM');

-- Contract: type + expiry
ALTER TABLE "contracts" ADD COLUMN "type" "ContractType" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "contracts" ADD COLUMN "expires_at" TIMESTAMP(3);

-- Award: kind + icon
ALTER TABLE "awards" ADD COLUMN "kind" "AwardKind" NOT NULL DEFAULT 'MEDAL';
ALTER TABLE "awards" ADD COLUMN "icon" VARCHAR(60);

-- Comments (polymorphic)
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entityType" "CommentEntity" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "comments_tenant_id_entityType_entity_id_created_at_idx" ON "comments"("tenant_id", "entityType", "entity_id", "created_at");
ALTER TABLE "comments" ADD CONSTRAINT "comments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Notifications
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "title" VARCHAR(200) NOT NULL,
    "body" VARCHAR(500),
    "href" VARCHAR(300),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_tenant_id_membership_id_read_at_idx" ON "notifications"("tenant_id", "membership_id", "read_at");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
