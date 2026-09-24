-- CreateTable
CREATE TABLE "company_directory" (
    "symbol" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_directory_pkey" PRIMARY KEY ("symbol")
);

-- CreateIndex
CREATE INDEX "company_directory_companyName_idx" ON "company_directory"("companyName");
