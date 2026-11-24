import type {
  ZombieDifficulty,
  ZombieSurvivalMove,
  ZombieSurvivalState,
} from '@projektbox/shared/types';
import { MultiplayerGameDefinition, Player } from '../../types/multiplayer.js';

function resolveDifficulty(raw?: unknown): ZombieDifficulty {
  if (raw === 'hard' || raw === 'nightmare') return raw;
  return 'normal';
}

export const zombieSurvivalGame: MultiplayerGameDefinition<
  ZombieSurvivalState,
  ZombieSurvivalMove
> = {
  id: 'zombie-survival',
  title: 'Zombie Arena 3D',
  minPlayers: 1,
  maxPlayers: 8,

  initGameState(players: Player[], starterId?: string, settings?: Record<string, any>): ZombieSurvivalState {
    const firstPlayerId =
      starterId && players.some((p) => p.id === starterId)
        ? starterId
        : players[0]?.id || '';

    const scores: Record<string, number> = {};
    const kills: Record<string, number> = {};
    const levels: Record<string, number> = {};
    const weapons: Record<string, string> = {};

    for (const player of players) {
      scores[player.id] = 0;
      kills[player.id] = 0;
      levels[player.id] = 1;
      weapons[player.id] = 'pistol';
    }

    return {
      gameId: 'zombie-survival',
      currentTurn: firstPlayerId,
      status: 'playing',
      winnerId: null,
      startedAt: Date.now(),
      difficulty: resolveDifficulty(settings?.category),
      wave: 1,
      zombiesKilled: 0,
      scores,
      kills,
      levels,
      weapons,
    };
  },

  validateAndApplyMove({ state, players, playerId, move }) {
    if (state.status !== 'playing') {
      return { valid: false, error: 'Das Spiel ist bereits beendet.', state };
    }

    const actor = players.find((p) => p.id === playerId);
    if (actor && !actor.isHost) {
      return {
        valid: false,
        error: 'Nur der TV-Screen oder Host darf das Match beenden.',
        state,
      };
    }

    if (!move || move.type !== 'zombie_finish') {
      return { valid: false, error: 'Ungültiger Spielzug.', state };
    }

    const nextScores: Record<string, number> = { ...state.scores };
    const nextKills: Record<string, number> = { ...state.kills };
    const nextLevels: Record<string, number> = { ...state.levels };
    const nextWeapons: Record<string, string> = { ...state.weapons };

    let totalKills = 0;
    for (const p of players) {
      const rawScore = move.scores?.[p.id];
      if (typeof rawScore === 'number' && Number.isFinite(rawScore)) {
        nextScores[p.id] = Math.min(1_000_000_000, Math.max(0, Math.round(rawScore)));
      }
      const rawKills = move.kills?.[p.id];
      if (typeof rawKills === 'number' && Number.isFinite(rawKills)) {
        nextKills[p.id] = Math.min(100_000, Math.max(0, Math.round(rawKills)));
      }
      const rawLevel = move.levels?.[p.id];
      if (typeof rawLevel === 'number' && Number.isFinite(rawLevel)) {
        nextLevels[p.id] = Math.min(99, Math.max(1, Math.round(rawLevel)));
      }
      const rawWeapon = move.weapons?.[p.id];
      if (typeof rawWeapon === 'string' && rawWeapon.trim().length > 0) {
        nextWeapons[p.id] = rawWeapon.trim().slice(0, 32);
      }
      totalKills += nextKills[p.id] || 0;
    }

    const sorted = [...players].sort(
      (a, b) => (nextScores[b.id] || 0) - (nextScores[a.id] || 0)
    );
    const topScore = sorted[0] ? nextScores[sorted[0].id] || 0 : 0;
    const tiedTop = sorted.filter((p) => (nextScores[p.id] || 0) === topScore);
    const isDraw = players.length > 1 && tiedTop.length > 1;
    const safeWave =
      typeof move.wave === 'number' && Number.isFinite(move.wave)
        ? Math.min(999, Math.max(1, Math.round(move.wave)))
        : state.wave;

    return {
      valid: true,
      state: {
        ...state,
        status: isDraw ? 'draw' : 'won',
        winnerId: isDraw ? null : sorted[0]?.id || null,
        wave: safeWave,
        zombiesKilled: totalKills,
        scores: nextScores,
        kills: nextKills,
        levels: nextLevels,
        weapons: nextWeapons,
      },
    };
  },
};
