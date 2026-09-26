-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('ANALYSING', 'DELIVERING', 'DONE', 'ABANDONED');

-- CreateEnum
CREATE TYPE "RunItemStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "briefOptIn" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "market_runs" (
    "id" TEXT NOT NULL,
    "runDate" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'ANALYSING',
    "creditCap" INTEGER NOT NULL,
    "creditsSpent" INTEGER NOT NULL DEFAULT 0,
    "continuations" INTEGER NOT NULL DEFAULT 0,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "run_items" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "status" "RunItemStatus" NOT NULL DEFAULT 'PENDING',
    "position" INTEGER NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "creditsSpent" INTEGER,
    "error" TEXT,

    CONSTRAINT "run_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signal_snapshots" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "runDate" TEXT NOT NULL,
    "asOf" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "sector" TEXT,
    "zScore" DOUBLE PRECISION NOT NULL,
    "verdict" TEXT NOT NULL,
    "fitQuality" DOUBLE PRECISION NOT NULL,
    "constituentCount" INTEGER NOT NULL,
    "totalReturn" DOUBLE PRECISION NOT NULL,
    "marketReturn" DOUBLE PRECISION NOT NULL,
    "sectorReturn" DOUBLE PRECISION NOT NULL,
    "idioReturn" DOUBLE PRECISION NOT NULL,
    "realityVerdict" TEXT NOT NULL,
    "smartMoneyType" TEXT,
    "smartMoneyConviction" DOUBLE PRECISION,
    "analysis" JSONB NOT NULL,
    "corporateActions" JSONB,
    "forwardSessions" INTEGER,
    "forwardStockReturn" DOUBLE PRECISION,
    "forwardTwinReturn" DOUBLE PRECISION,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signal_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "market_runs_runDate_key" ON "market_runs"("runDate");

-- CreateIndex
CREATE INDEX "run_items_runId_status_idx" ON "run_items"("runId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "run_items_runId_symbol_key" ON "run_items"("runId", "symbol");

-- CreateIndex
CREATE INDEX "signal_snapshots_runDate_idx" ON "signal_snapshots"("runDate");

-- CreateIndex
CREATE INDEX "signal_snapshots_symbol_resolvedAt_idx" ON "signal_snapshots"("symbol", "resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "signal_snapshots_symbol_runDate_key" ON "signal_snapshots"("symbol", "runDate");

-- AddForeignKey
ALTER TABLE "run_items" ADD CONSTRAINT "run_items_runId_fkey" FOREIGN KEY ("runId") REFERENCES "market_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
