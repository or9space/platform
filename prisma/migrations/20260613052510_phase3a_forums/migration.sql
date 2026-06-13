-- CreateTable
CREATE TABLE "forum_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "description" VARCHAR(500),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_threads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "author_membership_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_post_at" TIMESTAMP(3),

    CONSTRAINT "forum_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_posts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "author_membership_id" TEXT NOT NULL,
    "content" VARCHAR(20000) NOT NULL,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "forum_categories_tenant_id_sort_order_idx" ON "forum_categories"("tenant_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "forum_categories_tenant_id_slug_key" ON "forum_categories"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "forum_threads_tenant_id_category_id_idx" ON "forum_threads"("tenant_id", "category_id");

-- CreateIndex
CREATE INDEX "forum_threads_tenant_id_last_post_at_idx" ON "forum_threads"("tenant_id", "last_post_at" DESC);

-- CreateIndex
CREATE INDEX "forum_posts_tenant_id_thread_id_created_at_idx" ON "forum_posts"("tenant_id", "thread_id", "created_at");

-- AddForeignKey
ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "forum_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_author_membership_id_fkey" FOREIGN KEY ("author_membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "forum_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_author_membership_id_fkey" FOREIGN KEY ("author_membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
