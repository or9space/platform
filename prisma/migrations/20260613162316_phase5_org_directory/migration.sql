-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "is_listed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tagline" VARCHAR(200);
