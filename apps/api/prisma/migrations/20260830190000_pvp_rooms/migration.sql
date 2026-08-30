CREATE TYPE "PvpRoomStatus" AS ENUM ('FINISHED', 'CANCELLED');

CREATE TABLE "PvpRoom" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "status" "PvpRoomStatus" NOT NULL DEFAULT 'FINISHED',
  "betAmount" INTEGER NOT NULL,
  "payout" INTEGER NOT NULL DEFAULT 0,
  "winner" VARCHAR(16) NOT NULL,
  "opponentName" VARCHAR(64) NOT NULL DEFAULT 'Arcade Bot',
  "resultSeed" INTEGER NOT NULL,
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PvpRoom_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PvpRoom_idempotencyKey_key" ON "PvpRoom"("idempotencyKey");
CREATE INDEX "PvpRoom_createdAt_idx" ON "PvpRoom"("createdAt" DESC);
CREATE INDEX "PvpRoom_userId_createdAt_idx" ON "PvpRoom"("userId", "createdAt" DESC);
ALTER TABLE "PvpRoom" ADD CONSTRAINT "PvpRoom_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
