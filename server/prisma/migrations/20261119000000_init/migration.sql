-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "projektbox";

-- CreateTable
CREATE TABLE "projektbox"."Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projektbox"."PlayerStats" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projektbox"."Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "reconnectTokenHash" TEXT,
    "revokedReconnectTokenHashes" JSONB NOT NULL DEFAULT '[]',
    "playerId" TEXT NOT NULL,
    "registeredPlayerId" TEXT,
    "lobbyId" TEXT,
    "lobbyCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedReason" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projektbox"."Lobby" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "minPlayers" INTEGER NOT NULL DEFAULT 2,
    "maxPlayers" INTEGER NOT NULL DEFAULT 8,
    "status" TEXT NOT NULL,
    "stateVersion" INTEGER NOT NULL DEFAULT 0,
    "isTvMode" BOOLEAN NOT NULL DEFAULT false,
    "isSimulated" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "gameState" JSONB,
    "rematchVotes" JSONB NOT NULL DEFAULT '[]',
    "finishedResults" JSONB NOT NULL DEFAULT '[]',
    "processedActionIds" JSONB NOT NULL DEFAULT '[]',
    "pausedReason" TEXT,
    "pausedAt" TIMESTAMP(3),
    "hostDisconnectDeadline" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lobby_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projektbox"."LobbyParticipant" (
    "id" TEXT NOT NULL,
    "lobbyId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "registeredPlayerId" TEXT,
    "name" TEXT NOT NULL,
    "avatar" JSONB NOT NULL DEFAULT '{}',
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "isTvScreen" BOOLEAN NOT NULL DEFAULT false,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "eliminated" BOOLEAN NOT NULL DEFAULT false,
    "connectionState" TEXT NOT NULL DEFAULT 'connected',
    "sessionId" TEXT,
    "color" TEXT,
    "symbol" TEXT,
    "meta" JSONB,
    "disconnectedAt" TIMESTAMP(3),
    "reconnectDeadline" TIMESTAMP(3),
    "seatOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LobbyParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projektbox"."GameResult" (
    "id" TEXT NOT NULL,
    "lobbyId" TEXT,
    "lobbyCode" TEXT,
    "gameId" TEXT NOT NULL,
    "isTvMode" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "winnerId" TEXT,
    "winnerName" TEXT,
    "scores" JSONB NOT NULL DEFAULT '{}',
    "playersJson" JSONB NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Player_lastSeenAt_idx" ON "projektbox"."Player"("lastSeenAt");

-- CreateIndex
CREATE INDEX "PlayerStats_gameId_wins_totalScore_idx" ON "projektbox"."PlayerStats"("gameId", "wins", "totalScore");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerStats_playerId_gameId_key" ON "projektbox"."PlayerStats"("playerId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "projektbox"."Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_playerId_idx" ON "projektbox"."Session"("playerId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "projektbox"."Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lobby_code_key" ON "projektbox"."Lobby"("code");

-- CreateIndex
CREATE INDEX "Lobby_status_gameId_idx" ON "projektbox"."Lobby"("status", "gameId");

-- CreateIndex
CREATE INDEX "Lobby_expiresAt_idx" ON "projektbox"."Lobby"("expiresAt");

-- CreateIndex
CREATE INDEX "LobbyParticipant_playerId_idx" ON "projektbox"."LobbyParticipant"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "LobbyParticipant_lobbyId_playerId_key" ON "projektbox"."LobbyParticipant"("lobbyId", "playerId");

-- CreateIndex
CREATE INDEX "GameResult_gameId_finishedAt_idx" ON "projektbox"."GameResult"("gameId", "finishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameResult_gameId_startedAt_finishedAt_key" ON "projektbox"."GameResult"("gameId", "startedAt", "finishedAt");

-- AddForeignKey
ALTER TABLE "projektbox"."PlayerStats" ADD CONSTRAINT "PlayerStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "projektbox"."Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projektbox"."Session" ADD CONSTRAINT "Session_registeredPlayerId_fkey" FOREIGN KEY ("registeredPlayerId") REFERENCES "projektbox"."Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projektbox"."LobbyParticipant" ADD CONSTRAINT "LobbyParticipant_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "projektbox"."Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projektbox"."LobbyParticipant" ADD CONSTRAINT "LobbyParticipant_registeredPlayerId_fkey" FOREIGN KEY ("registeredPlayerId") REFERENCES "projektbox"."Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projektbox"."GameResult" ADD CONSTRAINT "GameResult_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "projektbox"."Lobby"("id") ON DELETE SET NULL ON UPDATE CASCADE;

