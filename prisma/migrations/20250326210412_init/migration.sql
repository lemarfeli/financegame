-- CreateTable
CREATE TABLE "GameSession" (
    "id" SERIAL NOT NULL,
    "seedCapital" INTEGER NOT NULL,
    "gameTime" INTEGER NOT NULL,
    "gameStatus" BOOLEAN NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateChanged" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "playerName" TEXT NOT NULL,
    "playerBalance" INTEGER NOT NULL DEFAULT 0,
    "availableLoan" BOOLEAN NOT NULL DEFAULT true,
    "gameSessionId" INTEGER NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateChanged" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
