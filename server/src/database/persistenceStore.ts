import type { Prisma } from '@prisma/client';
import type { GameResultRecord, Lobby, LobbyStatus, Player } from '../types/multiplayer.js';
import type { PersistedSessionRecord } from '../auth/sessionManager.js';
import { StatePersistenceStore, type PersistedSnapshot } from '../lobby/stateStore.js';
import {
  connectDatabaseClient,
  getPrismaClient,
  isDatabaseConfigured,
  sanitizeDatabaseError,
  withDatabaseRetry,
} from './prismaClient.js';

export interface CompletedResultMetadata {
  lobbyId?: string;
  lobbyCode?: string;
  isTvMode?: boolean;
}

export interface PersistenceStore {
  init(): Promise<void>;
  loadSnapshot(): Promise<PersistedSnapshot | null>;
  queueSave(lobbies: Lobby[], sessions: PersistedSessionRecord[]): Promise<void>;
  recordCompletedResult(result: GameResultRecord, meta?: CompletedResultMetadata): void;
  getCompletedResults(): GameResultRecord[];
  flush(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Kombinierter Persistenz-Layer für ProjektBox:
 * - Primär: Neon PostgreSQL über Prisma (sobald DATABASE_URL gesetzt ist)
 * - Ergänzend / Fallback: Bestehender Redis- & atomarer JSON-StateStore
 * Schreibt hochfrequente Events nicht synchron durch, sondern serialisiert Transaktionen sicher über writeChain.
 */
export class HybridPersistenceStore implements PersistenceStore {
  private readonly fallbackStore: StatePersistenceStore;
  private dbReady = false;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(fallbackStore: StatePersistenceStore) {
    this.fallbackStore = fallbackStore;
  }

  public isPostgresActive(): boolean {
    return this.dbReady;
  }

  public async init(): Promise<void> {
    await this.fallbackStore.init();

    if (!isDatabaseConfigured()) {
      console.log('[Persistence] DATABASE_URL nicht gesetzt; nutze Redis/JSON StateStore.');
      this.dbReady = false;
      return;
    }

    const connected = await connectDatabaseClient();
    if (!connected) {
      console.warn('[Persistence] Neon PostgreSQL nicht erreichbar; Fallback auf Redis/JSON aktiv.');
      this.dbReady = false;
      return;
    }

    try {
      const prisma = getPrismaClient();
      if (prisma) {
        // Prüft, ob die Tabellen bereits migriert sind (ohne Schema zu verändern)
        await prisma.lobby.count();
        this.dbReady = true;
        console.log('[Persistence] Neon PostgreSQL (Prisma) aktiv.');
      }
    } catch (err) {
      this.dbReady = false;
      console.warn(
        '[Persistence] Neon-Schema noch nicht migriert oder nicht lesbar; Fallback auf Redis/JSON:',
        sanitizeDatabaseError(err)
      );
    }
  }

  public getCompletedResults(): GameResultRecord[] {
    return this.fallbackStore.getCompletedResults();
  }

  public async loadSnapshot(): Promise<PersistedSnapshot | null> {
    const fallbackSnapshot = await this.fallbackStore.loadSnapshot();
    const prisma = getPrismaClient();
    if (!prisma || !this.dbReady) {
      return fallbackSnapshot;
    }

    try {
      const now = new Date();
      const [dbSessions, dbLobbies, dbResults] = await withDatabaseRetry(() =>
        Promise.all([
          prisma.session.findMany({
            where: { expiresAt: { gt: now } },
          }),
          prisma.lobby.findMany({
            where: {
              expiresAt: { gt: now },
              status: { not: 'expired' },
            },
            include: {
              participants: {
                orderBy: { seatOrder: 'asc' },
              },
            },
          }),
          prisma.gameResult.findMany({
            orderBy: { finishedAt: 'desc' },
            take: 200,
          }),
        ])
      );

      const sessions: PersistedSessionRecord[] = dbSessions.map((s) => ({
        sessionId: s.sessionId,
        tokenHash: s.tokenHash,
        reconnectTokenHash: s.reconnectTokenHash ?? undefined,
        revokedReconnectTokenHashes: Array.isArray(s.revokedReconnectTokenHashes)
          ? (s.revokedReconnectTokenHashes as string[])
          : [],
        playerId: s.playerId,
        lobbyId: s.lobbyId ?? undefined,
        lobbyCode: s.lobbyCode ?? undefined,
        createdAt: s.createdAt.getTime(),
        lastSeenAt: s.lastSeenAt.getTime(),
        expiresAt: s.expiresAt.getTime(),
        revoked: s.revoked,
        revokedReason: s.revokedReason ?? undefined,
      }));

      const lobbies: Lobby[] = dbLobbies.map((l) => ({
        id: l.id,
        code: l.code,
        name: l.name,
        isPrivate: l.isPrivate,
        gameId: l.gameId,
        minPlayers: l.minPlayers,
        maxPlayers: l.maxPlayers,
        hostId: l.hostId,
        status: l.status as LobbyStatus,
        stateVersion: l.stateVersion,
        isTvMode: l.isTvMode,
        isSimulated: l.isSimulated,
        settings: (l.settings as Record<string, any>) ?? {},
        gameState: (l.gameState as Lobby['gameState']) ?? null,
        rematchVotes: Array.isArray(l.rematchVotes) ? (l.rematchVotes as string[]) : [],
        finishedResults: Array.isArray(l.finishedResults)
          ? (l.finishedResults as unknown as GameResultRecord[])
          : [],
        processedActionIds: Array.isArray(l.processedActionIds)
          ? (l.processedActionIds as string[])
          : [],
        pausedReason: l.pausedReason ?? undefined,
        pausedAt: l.pausedAt?.getTime(),
        hostDisconnectDeadline: l.hostDisconnectDeadline?.getTime(),
        lastActivityAt: l.lastActivityAt.getTime(),
        expiresAt: l.expiresAt.getTime(),
        createdAt: l.createdAt.getTime(),
        players: l.participants.map(
          (p): Player => ({
            id: p.playerId,
            socketId: '',
            name: p.name,
            avatar: (p.avatar as Player['avatar']) ?? {},
            isReady: p.isReady,
            isHost: p.isHost,
            connected: false,
            connectionState: p.connectionState as Player['connectionState'],
            disconnectedAt: p.disconnectedAt?.getTime(),
            reconnectDeadline: p.reconnectDeadline?.getTime(),
            eliminated: p.eliminated,
            sessionId: p.sessionId ?? undefined,
            color: p.color ?? undefined,
            symbol: p.symbol ?? undefined,
            isTvScreen: p.isTvScreen,
            isBot: p.isBot,
            meta: (p.meta as Record<string, any>) ?? undefined,
          })
        ),
      }));

      const completedResults: GameResultRecord[] = dbResults
        .slice()
        .reverse()
        .map((r) => ({
          gameId: r.gameId,
          startedAt: r.startedAt.getTime(),
          finishedAt: r.finishedAt.getTime(),
          status: r.status === 'draw' ? 'draw' : 'won',
          winnerId: r.winnerId ?? null,
          winnerName: r.winnerName ?? null,
          scores: (r.scores as Record<string, number>) ?? undefined,
          players: Array.isArray(r.playersJson)
            ? (r.playersJson as GameResultRecord['players'])
            : [],
        }));

      for (const r of completedResults) {
        this.fallbackStore.recordCompletedResult(r);
      }

      // Falls DB leer ist, aber lokaler Fallback-Snapshot existiert (z. B. erste Migration), diesen übernehmen
      if (lobbies.length === 0 && sessions.length === 0 && fallbackSnapshot) {
        return fallbackSnapshot;
      }

      return {
        version: 1,
        savedAt: Date.now(),
        lobbies,
        sessions,
        completedResults,
      };
    } catch (err) {
      console.warn(
        '[Persistence] Fehler beim Laden aus Neon PostgreSQL; nutze Fallback-Snapshot:',
        sanitizeDatabaseError(err)
      );
      return fallbackSnapshot;
    }
  }

  public recordCompletedResult(result: GameResultRecord, meta?: CompletedResultMetadata): void {
    this.fallbackStore.recordCompletedResult(result);

    const prisma = getPrismaClient();
    if (!prisma || !this.dbReady) return;

    this.writeChain = this.writeChain
      .then(() => this.persistCompletedResultToPostgres(result, meta))
      .catch((err) => {
        console.warn(
          '[Persistence] Fehler beim Speichern des Spielergebnisses in Neon:',
          sanitizeDatabaseError(err)
        );
      });
  }

  public queueSave(lobbies: Lobby[], sessions: PersistedSessionRecord[]): Promise<void> {
    const fallbackPromise = this.fallbackStore.queueSave(lobbies, sessions);
    const prisma = getPrismaClient();
    if (!prisma || !this.dbReady) {
      return fallbackPromise;
    }

    const lobbiesClone: Lobby[] = JSON.parse(JSON.stringify(lobbies));
    const sessionsClone: PersistedSessionRecord[] = JSON.parse(JSON.stringify(sessions));

    this.writeChain = this.writeChain
      .then(() => Promise.all([fallbackPromise, this.persistStateToPostgres(lobbiesClone, sessionsClone)]).then(() => undefined))
      .catch((err) => {
        console.warn('[Persistence] Fehler bei Neon-Snapshot-Sync:', sanitizeDatabaseError(err));
      });

    return this.writeChain;
  }

  public async flush(): Promise<void> {
    await this.writeChain;
    await this.fallbackStore.flush();
  }

  public async close(): Promise<void> {
    await this.flush();
    await this.fallbackStore.close();
  }

  private async persistCompletedResultToPostgres(
    result: GameResultRecord,
    meta?: CompletedResultMetadata
  ): Promise<void> {
    const prisma = getPrismaClient();
    if (!prisma) return;

    const startedAt = new Date(result.startedAt);
    const finishedAt = new Date(result.finishedAt);

    await withDatabaseRetry(() =>
      prisma.$transaction(async (tx) => {
        const existing = await tx.gameResult.findUnique({
          where: {
            gameId_startedAt_finishedAt: {
              gameId: result.gameId,
              startedAt,
              finishedAt,
            },
          },
        });
        if (existing) return;

        let linkedLobbyId: string | null = null;
        if (meta?.lobbyId) {
          const lobbyRow = await tx.lobby.findUnique({
            where: { id: meta.lobbyId },
            select: { id: true },
          });
          linkedLobbyId = lobbyRow?.id ?? null;
        }

        const normalizedStatus = result.status ?? (result.winnerId ? 'won' : 'draw');
        await tx.gameResult.create({
          data: {
            lobbyId: linkedLobbyId,
            lobbyCode: meta?.lobbyCode ?? null,
            gameId: result.gameId,
            isTvMode: Boolean(meta?.isTvMode),
            status: normalizedStatus,
            winnerId: result.winnerId,
            winnerName: result.winnerName,
            scores: (result.scores ?? {}) as Prisma.InputJsonValue,
            playersJson: result.players as Prisma.InputJsonValue,
            startedAt,
            finishedAt,
          },
        });

        for (const playerEntry of result.players) {
          if (!playerEntry.id || playerEntry.id.startsWith('bot_') || playerEntry.id.startsWith('tv_')) {
            continue;
          }

          await tx.player.upsert({
            where: { id: playerEntry.id },
            create: {
              id: playerEntry.id,
              name: playerEntry.name,
              avatar: {},
              lastSeenAt: finishedAt,
            },
            update: {
              name: playerEntry.name,
              lastSeenAt: finishedAt,
            },
          });

          const playerScore = Math.round(
            playerEntry.score ?? result.scores?.[playerEntry.id] ?? 0
          );
          const isWinner = normalizedStatus === 'won' && result.winnerId === playerEntry.id;
          const isDraw = normalizedStatus === 'draw';

          const currentStats = await tx.playerStats.findUnique({
            where: {
              playerId_gameId: {
                playerId: playerEntry.id,
                gameId: result.gameId,
              },
            },
          });

          if (!currentStats) {
            await tx.playerStats.create({
              data: {
                playerId: playerEntry.id,
                gameId: result.gameId,
                gamesPlayed: 1,
                wins: isWinner ? 1 : 0,
                draws: isDraw ? 1 : 0,
                totalScore: playerScore,
                bestScore: playerScore,
              },
            });
          } else {
            await tx.playerStats.update({
              where: {
                playerId_gameId: {
                  playerId: playerEntry.id,
                  gameId: result.gameId,
                },
              },
              data: {
                gamesPlayed: { increment: 1 },
                wins: { increment: isWinner ? 1 : 0 },
                draws: { increment: isDraw ? 1 : 0 },
                totalScore: { increment: playerScore },
                bestScore: Math.max(currentStats.bestScore, playerScore),
              },
            });
          }
        }
      })
    );
  }

  private async persistStateToPostgres(
    lobbies: Lobby[],
    sessions: PersistedSessionRecord[]
  ): Promise<void> {
    const prisma = getPrismaClient();
    if (!prisma) return;

    await withDatabaseRetry(() =>
      prisma.$transaction(async (tx) => {
        const now = new Date();
        const activeLobbyIds = lobbies.map((l) => l.id);

        // 1. Echte Spielerprofile (nicht Bots/TV-Screens) vor Foreign-Key-Beziehungen absichern
        const humanPlayerMap = new Map<string, { name?: string; avatar?: any; lastSeenAt: Date }>();
        for (const sess of sessions) {
          if (sess.playerId && !sess.playerId.startsWith('bot_') && !sess.playerId.startsWith('tv_')) {
            humanPlayerMap.set(sess.playerId, {
              lastSeenAt: new Date(sess.lastSeenAt),
            });
          }
        }
        for (const lobby of lobbies) {
          for (const p of lobby.players) {
            if (!p.isBot && !p.isTvScreen && p.id) {
              humanPlayerMap.set(p.id, {
                name: p.name,
                avatar: p.avatar ?? {},
                lastSeenAt: new Date(lobby.lastActivityAt ?? now.getTime()),
              });
            }
          }
        }

        for (const [playerId, info] of humanPlayerMap.entries()) {
          await tx.player.upsert({
            where: { id: playerId },
            create: {
              id: playerId,
              name: info.name || 'Spieler',
              avatar: (info.avatar ?? {}) as Prisma.InputJsonValue,
              lastSeenAt: info.lastSeenAt,
            },
            update: info.name
              ? {
                  name: info.name,
                  avatar: (info.avatar ?? {}) as Prisma.InputJsonValue,
                  lastSeenAt: info.lastSeenAt,
                }
              : {
                  lastSeenAt: info.lastSeenAt,
                },
          });
        }

        // 2. Sessions synchronisieren
        for (const s of sessions) {
          const registeredPlayerId = humanPlayerMap.has(s.playerId) ? s.playerId : null;
          await tx.session.upsert({
            where: { sessionId: s.sessionId },
            create: {
              sessionId: s.sessionId,
              tokenHash: s.tokenHash,
              reconnectTokenHash: s.reconnectTokenHash ?? null,
              revokedReconnectTokenHashes: s.revokedReconnectTokenHashes as Prisma.InputJsonValue,
              playerId: s.playerId,
              registeredPlayerId,
              lobbyId: s.lobbyId ?? null,
              lobbyCode: s.lobbyCode ?? null,
              createdAt: new Date(s.createdAt),
              lastSeenAt: new Date(s.lastSeenAt),
              expiresAt: new Date(s.expiresAt),
              revoked: s.revoked,
              revokedReason: s.revokedReason ?? null,
            },
            update: {
              reconnectTokenHash: s.reconnectTokenHash ?? null,
              revokedReconnectTokenHashes: s.revokedReconnectTokenHashes as Prisma.InputJsonValue,
              registeredPlayerId,
              lobbyId: s.lobbyId ?? null,
              lobbyCode: s.lobbyCode ?? null,
              lastSeenAt: new Date(s.lastSeenAt),
              expiresAt: new Date(s.expiresAt),
              revoked: s.revoked,
              revokedReason: s.revokedReason ?? null,
            },
          });
        }

        await tx.session.deleteMany({
          where: {
            expiresAt: { lt: now },
          },
        });

        // 3. Abgelaufene/beendete alte Lobbys bereinigen (GameResult bleibt dank onDelete: SetNull erhalten)
        await tx.lobby.deleteMany({
          where: {
            OR: [
              { expiresAt: { lt: now } },
              {
                AND: [
                  { status: 'expired' },
                  { id: { notIn: activeLobbyIds.length > 0 ? activeLobbyIds : ['__none__'] } },
                ],
              },
              ...(activeLobbyIds.length > 0
                ? [{ id: { notIn: activeLobbyIds } }]
                : [{}]),
            ],
          },
        });

        // 4. Aktive Lobbys & Teilnehmer upserten
        for (const lobby of lobbies) {
          await tx.lobby.deleteMany({
            where: {
              code: lobby.code,
              id: { not: lobby.id },
            },
          });

          await tx.lobby.upsert({
            where: { id: lobby.id },
            create: {
              id: lobby.id,
              code: lobby.code,
              name: lobby.name,
              gameId: lobby.gameId,
              hostId: lobby.hostId,
              isPrivate: lobby.isPrivate,
              minPlayers: lobby.minPlayers,
              maxPlayers: lobby.maxPlayers,
              status: lobby.status,
              stateVersion: lobby.stateVersion,
              isTvMode: Boolean(lobby.isTvMode),
              isSimulated: Boolean(lobby.isSimulated),
              settings: (lobby.settings ?? {}) as Prisma.InputJsonValue,
              gameState: (lobby.gameState ?? null) as Prisma.InputJsonValue,
              rematchVotes: (lobby.rematchVotes ?? []) as Prisma.InputJsonValue,
              finishedResults: (lobby.finishedResults ?? []) as unknown as Prisma.InputJsonValue,
              processedActionIds: (lobby.processedActionIds ?? []) as Prisma.InputJsonValue,
              pausedReason: lobby.pausedReason ?? null,
              pausedAt: lobby.pausedAt ? new Date(lobby.pausedAt) : null,
              hostDisconnectDeadline: lobby.hostDisconnectDeadline
                ? new Date(lobby.hostDisconnectDeadline)
                : null,
              lastActivityAt: new Date(lobby.lastActivityAt ?? lobby.createdAt),
              expiresAt: new Date(lobby.expiresAt),
              createdAt: new Date(lobby.createdAt),
            },
            update: {
              code: lobby.code,
              name: lobby.name,
              hostId: lobby.hostId,
              isPrivate: lobby.isPrivate,
              status: lobby.status,
              stateVersion: lobby.stateVersion,
              isTvMode: Boolean(lobby.isTvMode),
              settings: (lobby.settings ?? {}) as Prisma.InputJsonValue,
              gameState: (lobby.gameState ?? null) as Prisma.InputJsonValue,
              rematchVotes: (lobby.rematchVotes ?? []) as Prisma.InputJsonValue,
              finishedResults: (lobby.finishedResults ?? []) as unknown as Prisma.InputJsonValue,
              processedActionIds: (lobby.processedActionIds ?? []) as Prisma.InputJsonValue,
              pausedReason: lobby.pausedReason ?? null,
              pausedAt: lobby.pausedAt ? new Date(lobby.pausedAt) : null,
              hostDisconnectDeadline: lobby.hostDisconnectDeadline
                ? new Date(lobby.hostDisconnectDeadline)
                : null,
              lastActivityAt: new Date(lobby.lastActivityAt ?? lobby.createdAt),
              expiresAt: new Date(lobby.expiresAt),
            },
          });

          const participantIds = lobby.players.map((p) => p.id);
          await tx.lobbyParticipant.deleteMany({
            where: {
              lobbyId: lobby.id,
              ...(participantIds.length > 0 ? { playerId: { notIn: participantIds } } : {}),
            },
          });

          for (let seatIdx = 0; seatIdx < lobby.players.length; seatIdx++) {
            const p = lobby.players[seatIdx];
            const registeredPlayerId =
              !p.isBot && !p.isTvScreen && humanPlayerMap.has(p.id) ? p.id : null;

            await tx.lobbyParticipant.upsert({
              where: {
                lobbyId_playerId: {
                  lobbyId: lobby.id,
                  playerId: p.id,
                },
              },
              create: {
                lobbyId: lobby.id,
                playerId: p.id,
                registeredPlayerId,
                name: p.name,
                avatar: (p.avatar ?? {}) as Prisma.InputJsonValue,
                isReady: Boolean(p.isReady),
                isHost: Boolean(p.isHost),
                isTvScreen: Boolean(p.isTvScreen),
                isBot: Boolean(p.isBot),
                eliminated: Boolean(p.eliminated),
                connectionState: p.connectionState ?? (p.connected ? 'connected' : 'disconnected'),
                sessionId: p.sessionId ?? null,
                color: p.color ?? null,
                symbol: p.symbol ?? null,
                meta: (p.meta ?? null) as Prisma.InputJsonValue,
                disconnectedAt: p.disconnectedAt ? new Date(p.disconnectedAt) : null,
                reconnectDeadline: p.reconnectDeadline ? new Date(p.reconnectDeadline) : null,
                seatOrder: seatIdx,
              },
              update: {
                registeredPlayerId,
                name: p.name,
                avatar: (p.avatar ?? {}) as Prisma.InputJsonValue,
                isReady: Boolean(p.isReady),
                isHost: Boolean(p.isHost),
                isTvScreen: Boolean(p.isTvScreen),
                isBot: Boolean(p.isBot),
                eliminated: Boolean(p.eliminated),
                connectionState: p.connectionState ?? (p.connected ? 'connected' : 'disconnected'),
                sessionId: p.sessionId ?? null,
                color: p.color ?? null,
                symbol: p.symbol ?? null,
                meta: (p.meta ?? null) as Prisma.InputJsonValue,
                disconnectedAt: p.disconnectedAt ? new Date(p.disconnectedAt) : null,
                reconnectDeadline: p.reconnectDeadline ? new Date(p.reconnectDeadline) : null,
                seatOrder: seatIdx,
              },
            });
          }
        }
      })
    );
  }
}

export function createDefaultPersistenceStore(options: {
  filePath: string;
  redisUrl?: string;
}): HybridPersistenceStore {
  const fallbackStore = new StatePersistenceStore({
    filePath: options.filePath,
    redisUrl: options.redisUrl,
  });
  return new HybridPersistenceStore(fallbackStore);
}
