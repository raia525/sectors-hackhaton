-- CreateEnum
CREATE TYPE "RuleMetric" AS ENUM ('PRICE', 'CHANGE_1D', 'VOLUME', 'VOLUME_RATIO', 'RETURN_5D', 'Z_SCORE', 'STOCK_SPECIFIC', 'PE', 'PB', 'DIVIDEND_YIELD', 'RANGE_POSITION');

-- CreateEnum
CREATE TYPE "RuleOperator" AS ENUM ('LT', 'LTE', 'EQ', 'GTE', 'GT');

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'RULE';

-- AlterTable
ALTER TABLE "signal_snapshots" ADD COLUMN     "keyStats" JSONB,
ADD COLUMN     "marketFacts" JSONB;

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "watchlistItemId" TEXT NOT NULL,
    "metric" "RuleMetric" NOT NULL,
    "operator" "RuleOperator" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "autoTune" BOOLEAN NOT NULL DEFAULT false,
    "preset" TEXT,
    "note" TEXT,
    "lastMet" BOOLEAN,
    "lastValue" DOUBLE PRECISION,
    "lastCheckedAt" TIMESTAMP(3),
    "lastTriggeredAt" TIMESTAMP(3),
    "tunedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alert_rules_watchlistItemId_idx" ON "alert_rules"("watchlistItemId");

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_watchlistItemId_fkey" FOREIGN KEY ("watchlistItemId") REFERENCES "watchlist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
