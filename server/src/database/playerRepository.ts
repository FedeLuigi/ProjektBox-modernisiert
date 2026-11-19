import type { Prisma } from '@prisma/client';
import { getPrismaClient, isDatabaseConnected, sanitizeDatabaseError, withDatabaseRetry } from './prismaClient.js';

export interface StoredPlayerProfile {
  id: string;
  name: string;
  avatar: Record<string, any>;
  lastSeenAt: number;
  stats: Array<{
    gameId: string;
    gamesPlayed: number;
    wins: number;
    draws: number;
    totalScore: number;
    bestScore: number;
  }>;
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  avatar: Record<string, any>;
  gameId: string;
  gamesPlayed: number;
  wins: number;
  draws: number;
  totalScore: number;
  bestScore: number;
}

export async function upsertPersistentPlayerProfile(input: {
  id: string;
  name: string;
  avatar?: Record<string, any>;
}): Promise<boolean> {
  const prisma = getPrismaClient();
  if (!prisma || !isDatabaseConnected()) return false;

  try {
    await withDatabaseRetry(() =>
      prisma.player.upsert({
        where: { id: input.id },
        create: {
          id: input.id,
          name: input.name,
          avatar: (input.avatar ?? {}) as Prisma.InputJsonValue,
          lastSeenAt: new Date(),
        },
        update: {
          name: input.name,
          avatar: (input.avatar ?? {}) as Prisma.InputJsonValue,
          lastSeenAt: new Date(),
        },
      })
    );
    return true;
  } catch (err) {
    console.warn('[PlayerRepo] Profil-Speicherung fehlgeschlagen:', sanitizeDatabaseError(err));
    return false;
  }
}

export async function getPersistentPlayerProfile(
  playerId: string
): Promise<StoredPlayerProfile | null> {
  const prisma = getPrismaClient();
  if (!prisma || !isDatabaseConnected()) return null;

  try {
    const row = await withDatabaseRetry(() =>
      prisma.player.findUnique({
        where: { id: playerId },
        include: { stats: true },
      })
    );
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      avatar: (row.avatar as Record<string, any>) ?? {},
      lastSeenAt: row.lastSeenAt.getTime(),
      stats: row.stats.map((st) => ({
        gameId: st.gameId,
        gamesPlayed: st.gamesPlayed,
        wins: st.wins,
        draws: st.draws,
        totalScore: st.totalScore,
        bestScore: st.bestScore,
      })),
    };
  } catch (err) {
    console.warn('[PlayerRepo] Profil-Abruf fehlgeschlagen:', sanitizeDatabaseError(err));
    return null;
  }
}

export async function getGameLeaderboard(
  gameId?: string,
  limit = 20
): Promise<LeaderboardEntry[]> {
  const prisma = getPrismaClient();
  if (!prisma || !isDatabaseConnected()) return [];

  try {
    const rows = await withDatabaseRetry(() =>
      prisma.playerStats.findMany({
        where: gameId ? { gameId } : undefined,
        include: { player: true },
        orderBy: [{ wins: 'desc' }, { bestScore: 'desc' }, { totalScore: 'desc' }],
        take: Math.max(1, Math.min(50, limit)),
      })
    );
    return rows.map((row) => ({
      playerId: row.playerId,
      name: row.player.name,
      avatar: (row.player.avatar as Record<string, any>) ?? {},
      gameId: row.gameId,
      gamesPlayed: row.gamesPlayed,
      wins: row.wins,
      draws: row.draws,
      totalScore: row.totalScore,
      bestScore: row.bestScore,
    }));
  } catch (err) {
    console.warn('[PlayerRepo] Bestenliste fehlgeschlagen:', sanitizeDatabaseError(err));
    return [];
  }
}
