-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "BrandAssetKind" AS ENUM ('LOGO', 'FAVICON');

-- CreateEnum
CREATE TYPE "AnnouncementTone" AS ENUM ('INFO', 'WARNING', 'SUCCESS');

-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL', 'SIGNED_IN', 'GUESTS');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER',
ADD COLUMN     "sessionsRevokedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "brand_palettes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lightAccent" TEXT NOT NULL,
    "lightAccentHover" TEXT NOT NULL,
    "lightAccentBright" TEXT NOT NULL,
    "lightAccentSoft" TEXT NOT NULL,
    "darkAccent" TEXT NOT NULL,
    "darkAccentHover" TEXT NOT NULL,
    "darkAccentBright" TEXT NOT NULL,
    "darkAccentSoft" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_palettes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_assets" (
    "id" TEXT NOT NULL,
    "kind" "BrandAssetKind" NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_overrides" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "messageEn" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "tone" "AnnouncementTone" NOT NULL DEFAULT 'INFO',
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL',
    "linkUrl" TEXT,
    "linkLabelEn" TEXT,
    "linkLabelId" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "universe_stocks" (
    "symbol" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "universe_stocks_pkey" PRIMARY KEY ("symbol")
);

-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brand_assets_kind_isActive_idx" ON "brand_assets"("kind", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "content_overrides_key_locale_key" ON "content_overrides"("key", "locale");

-- CreateIndex
CREATE INDEX "admin_audit_log_createdAt_idx" ON "admin_audit_log"("createdAt");

-- The first admin, chosen by the project owner. Only takes effect if the
-- account already exists when this runs; otherwise grant it afterwards with
-- `npm run admin:grant -- <email>`.
UPDATE "users" SET "role" = 'ADMIN' WHERE "email" = 'raiapratam001@gmail.com';
