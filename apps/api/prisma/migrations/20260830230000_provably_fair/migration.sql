ALTER TABLE "GameRound" ADD COLUMN "fairValue" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ProvablyFairSeed" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "gameRoundId" UUID,
    "serverSeed" VARCHAR(64) NOT NULL,
    "serverSeedHash" VARCHAR(64) NOT NULL,
    "clientSeed" VARCHAR(191),
    "nonce" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "revealedAt" TIMESTAMP(3),
    CONSTRAINT "ProvablyFairSeed_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProvablyFairSeed_gameRoundId_key" ON "ProvablyFairSeed"("gameRoundId");
CREATE INDEX "ProvablyFairSeed_userId_gameId_usedAt_idx" ON "ProvablyFairSeed"("userId", "gameId", "usedAt");
CREATE INDEX "ProvablyFairSeed_gameId_createdAt_idx" ON "ProvablyFairSeed"("gameId", "createdAt" DESC);
CREATE INDEX "ProvablyFairSeed_serverSeedHash_idx" ON "ProvablyFairSeed"("serverSeedHash");

ALTER TABLE "ProvablyFairSeed" ADD CONSTRAINT "ProvablyFairSeed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProvablyFairSeed" ADD CONSTRAINT "ProvablyFairSeed_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProvablyFairSeed" ADD CONSTRAINT "ProvablyFairSeed_gameRoundId_fkey" FOREIGN KEY ("gameRoundId") REFERENCES "GameRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
