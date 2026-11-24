import type {
  GoldMinerMode,
  GoldMinerMove,
  GoldMinerState,
} from '@projektbox/shared/types';
import { MultiplayerGameDefinition, Player } from '../../types/multiplayer.js';

function resolveMode(raw?: unknown): GoldMinerMode {
  return raw === 'versus' ? 'versus' : 'coop';
}

export const goldMinerGame: MultiplayerGameDefinition<
  GoldMinerState,
  GoldMinerMove
> = {
  id: 'gold-miner',
  title: 'Gold Miner',
  minPlayers: 1,
  maxPlayers: 8,

  initGameState(players: Player[], starterId?: string, settings?: Record<string, any>): GoldMinerState {
    const firstPlayerId =
      starterId && players.some((p) => p.id === starterId)
        ? starterId
        : players[0]?.id || '';

    const scores: Record<string, number> = {};
    for (const player of players) {
      scores[player.id] = 0;
    }

    return {
      gameId: 'gold-miner',
      currentTurn: firstPlayerId,
      status: 'playing',
      winnerId: null,
      startedAt: Date.now(),
      mode: resolveMode(settings?.category),
      level: 1,
      scores,
    };
  },

  validateAndApplyMove({ state, players, move }) {
    if (state.status !== 'playing') {
      return { valid: false, error: 'Das Spiel ist bereits beendet.', state };
    }

    if (!move || move.type !== 'goldminer_finish') {
      return { valid: false, error: 'Ungültiger Spielzug.', state };
    }

    const nextScores: Record<string, number> = { ...state.scores };
    for (const p of players) {
      if (typeof move.scores?.[p.id] === 'number' && Number.isFinite(move.scores[p.id])) {
        nextScores[p.id] = Math.max(0, Math.round(move.scores[p.id]));
      }
    }

    const sorted = [...players].sort(
      (a, b) => (nextScores[b.id] || 0) - (nextScores[a.id] || 0),
    );
    const topScore = sorted[0] ? nextScores[sorted[0].id] || 0 : 0;
    const tiedTop = sorted.filter((p) => (nextScores[p.id] || 0) === topScore);
    const isDraw = players.length > 1 && tiedTop.length > 1;

    return {
      valid: true,
      state: {
        ...state,
        status: isDraw ? 'draw' : 'won',
        winnerId: isDraw ? null : sorted[0]?.id || null,
        level: Math.max(1, Math.round(move.level || state.level)),
        scores: nextScores,
      },
    };
  },
};
