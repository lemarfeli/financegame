-- CreateTable
CREATE TABLE "GameSession" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "seedCapital" INTEGER,
    "gameTime" INTEGER,
    "startTime" TIMESTAMP(3),
    "gameStatus" BOOLEAN NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateChanged" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsApply" (
    "id" SERIAL NOT NULL,
    "newsId" INTEGER NOT NULL,
    "gameSessionId" INTEGER NOT NULL,
    "visibility" BOOLEAN NOT NULL,
    "active" BOOLEAN NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateChanged" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsApply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "effectCoEfficient" DOUBLE PRECISION NOT NULL,
    "companyTypeId" INTEGER NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "playerName" VARCHAR(100) NOT NULL,
    "playerBalance" INTEGER NOT NULL DEFAULT 0,
    "gameSessionId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCreator" BOOLEAN NOT NULL DEFAULT false,
    "hasActiveLoan" BOOLEAN NOT NULL DEFAULT false,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "token" TEXT NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateChanged" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" SERIAL NOT NULL,
    "resourceName" VARCHAR(100) NOT NULL,
    "resourCecost" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceOwner" (
    "id" SERIAL NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateChanged" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketResource" (
    "id" SERIAL NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "gameSessionId" INTEGER NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "dateAdded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" SERIAL NOT NULL,
    "amount" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "period" INTEGER NOT NULL,
    "amountRepaid" INTEGER NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "datePayout" TIMESTAMP(3),
    "dateChanged" TIMESTAMP(3) NOT NULL,
    "playerId" INTEGER NOT NULL,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" SERIAL NOT NULL,
    "amount" INTEGER NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "period" INTEGER NOT NULL,
    "debt" INTEGER NOT NULL,
    "fine" INTEGER NOT NULL DEFAULT 0,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateClose" TIMESTAMP(3),
    "dateChanged" TIMESTAMP(3) NOT NULL,
    "playerId" INTEGER NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyType" (
    "id" SERIAL NOT NULL,
    "typeName" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "baseIncome" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CompanyType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyTypeId" INTEGER NOT NULL,
    "incomeCoEfficient" DOUBLE PRECISION NOT NULL,
    "divident_rate" DOUBLE PRECISION NOT NULL,
    "isBroken" BOOLEAN NOT NULL DEFAULT false,
    "level" INTEGER NOT NULL DEFAULT 0,
    "playerId" INTEGER,
    "gameSessionId" INTEGER,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateChanged" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shares" (
    "id" SERIAL NOT NULL,
    "costShares" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateChanged" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharesTransaction" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "sharesId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "transactionType" BOOLEAN NOT NULL,
    "price" INTEGER NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateChanged" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharesTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharesOwner" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "sharesId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateChanged" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharesOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DividentPayment" (
    "id" SERIAL NOT NULL,
    "sharesOwnerId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateChanged" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DividentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requirements" (
    "id" SERIAL NOT NULL,
    "amount" INTEGER NOT NULL,
    "companyTypeId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,

    CONSTRAINT "Requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyRevenues" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "revenue" INTEGER NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEnd" TIMESTAMP(3) NOT NULL,
    "dateChanged" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyRevenues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tax" (
    "id" SERIAL NOT NULL,
    "amount" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL,
    "companyRevenuesId" INTEGER NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFee" TIMESTAMP(3),
    "dateChanged" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tax_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameSession_code_key" ON "GameSession"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Player_token_key" ON "Player"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceOwner_playerId_resourceId_key" ON "ResourceOwner"("playerId", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Shares_companyId_key" ON "Shares"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SharesOwner_playerId_sharesId_key" ON "SharesOwner"("playerId", "sharesId");

-- CreateIndex
CREATE UNIQUE INDEX "Requirements_resourceId_companyTypeId_key" ON "Requirements"("resourceId", "companyTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Tax_companyRevenuesId_key" ON "Tax"("companyRevenuesId");

-- AddForeignKey
ALTER TABLE "NewsApply" ADD CONSTRAINT "NewsApply_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsApply" ADD CONSTRAINT "NewsApply_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_companyTypeId_fkey" FOREIGN KEY ("companyTypeId") REFERENCES "CompanyType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceOwner" ADD CONSTRAINT "ResourceOwner_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceOwner" ADD CONSTRAINT "ResourceOwner_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketResource" ADD CONSTRAINT "MarketResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketResource" ADD CONSTRAINT "MarketResource_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_companyTypeId_fkey" FOREIGN KEY ("companyTypeId") REFERENCES "CompanyType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shares" ADD CONSTRAINT "Shares_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharesTransaction" ADD CONSTRAINT "SharesTransaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharesTransaction" ADD CONSTRAINT "SharesTransaction_sharesId_fkey" FOREIGN KEY ("sharesId") REFERENCES "Shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharesOwner" ADD CONSTRAINT "SharesOwner_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharesOwner" ADD CONSTRAINT "SharesOwner_sharesId_fkey" FOREIGN KEY ("sharesId") REFERENCES "Shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DividentPayment" ADD CONSTRAINT "DividentPayment_sharesOwnerId_fkey" FOREIGN KEY ("sharesOwnerId") REFERENCES "SharesOwner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirements" ADD CONSTRAINT "Requirements_companyTypeId_fkey" FOREIGN KEY ("companyTypeId") REFERENCES "CompanyType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirements" ADD CONSTRAINT "Requirements_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyRevenues" ADD CONSTRAINT "CompanyRevenues_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tax" ADD CONSTRAINT "Tax_companyRevenuesId_fkey" FOREIGN KEY ("companyRevenuesId") REFERENCES "CompanyRevenues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
