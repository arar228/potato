-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('COIN_FLIP', 'POCKET_POOL');

-- CreateEnum
CREATE TYPE "GameRoundStatus" AS ENUM ('RESOLVING', 'FINISHED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Game" (
    "id" UUID NOT NULL,
    "type" "GameType" NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRound" (
    "id" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "status" "GameRoundStatus" NOT NULL DEFAULT 'RESOLVING',
    "betAmount" INTEGER NOT NULL,
    "payout" INTEGER NOT NULL DEFAULT 0,
    "selectedSide" VARCHAR(16) NOT NULL,
    "result" VARCHAR(16) NOT NULL,
    "idempotencyKey" VARCHAR(191) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_type_key" ON "Game"("type");

-- CreateIndex
CREATE INDEX "Game_isActive_idx" ON "Game"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_idempotencyKey_key" ON "GameRound"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GameRound_gameId_idx" ON "GameRound"("gameId");

-- CreateIndex
CREATE INDEX "GameRound_userId_createdAt_idx" ON "GameRound"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GameRound_status_idx" ON "GameRound"("status");

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
