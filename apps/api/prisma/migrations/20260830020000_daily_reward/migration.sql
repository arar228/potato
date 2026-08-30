-- CreateTable
CREATE TABLE "DailyReward" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "rewardDate" DATE NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "idempotencyKey" VARCHAR(191) NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyReward_idempotencyKey_key" ON "DailyReward"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReward_userId_rewardDate_key" ON "DailyReward"("userId", "rewardDate");

-- CreateIndex
CREATE INDEX "DailyReward_userId_claimedAt_idx" ON "DailyReward"("userId", "claimedAt" DESC);

-- CreateIndex
CREATE INDEX "DailyReward_walletId_idx" ON "DailyReward"("walletId");

-- AddForeignKey
ALTER TABLE "DailyReward" ADD CONSTRAINT "DailyReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReward" ADD CONSTRAINT "DailyReward_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
