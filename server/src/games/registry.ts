import { MultiplayerGameDefinition, Player } from '../types/multiplayer.js';
import { drawAndGuessGame } from './definitions/drawAndGuess.js';
import { rouletteGame } from './definitions/roulette.js';
import { stadtLandFlussGame } from './definitions/stadtLandFluss.js';
import { texasHoldemGame } from './definitions/texasHoldem.js';
import { zombieSurvivalGame } from './definitions/zombieSurvival.js';
import { goldMinerGame } from './definitions/goldMiner.js';

function createStandardGame(id: string, title?: string, minPlayers = 2, maxPlayers = 4): MultiplayerGameDefinition {
  return {
    id,
    title: title || id,
    minPlayers,
    maxPlayers,
    initGameState(players: Player[], starterId?: string) {
      const firstTurn = starterId && players.some((p) => p.id === starterId)
        ? starterId
        : players[0]?.id || '';
      return {
        gameId: id,
        currentTurn: firstTurn,
        status: 'playing',
        winnerId: null,
        scores: Object.fromEntries(players.map((p) => [p.id, 0])),
        startedAt: Date.now(),
      };
    },
    validateAndApplyMove({ state, players, playerId, move }) {
      if (state.status !== 'playing') {
        return { valid: false, error: 'Das Spiel ist bereits beendet.', state };
      }
      const nextPlayer = players.find((p) => p.id !== playerId) || players[0];
      const newScores = { ...(state.scores || {}) };
      if (typeof move?.score === 'number') {
        newScores[playerId] = move?.finish || move?.isAbsolute
          ? move.score
          : (newScores[playerId] || 0) + move.score;
      }
      const isFinished = Boolean(move?.finish);
      return {
        valid: true,
        state: {
          ...state,
          currentTurn: nextPlayer.id,
          status: isFinished ? 'won' : state.status,
          winnerId: isFinished ? playerId : state.winnerId,
          scores: newScores,
          lastMove: move,
        },
      };
    },
  };
}

export class GameRegistry {
  private games = new Map<string, MultiplayerGameDefinition<any, any>>();

  constructor() {
    // Multiplayer- & Party-Spiele
    this.register(drawAndGuessGame);
    this.register(stadtLandFlussGame);
    this.register(rouletteGame);
    this.register(texasHoldemGame);
    this.register(zombieSurvivalGame);
    this.register(goldMinerGame);
  }

  public register(game: MultiplayerGameDefinition<any, any>): void {
    this.games.set(game.id, game);
  }

  public get(gameId: string): MultiplayerGameDefinition<any, any> | undefined {
    return this.games.get(gameId) || createStandardGame(gameId);
  }

  public getAll(): MultiplayerGameDefinition<any, any>[] {
    return Array.from(this.games.values());
  }

  public has(gameId: string): boolean {
    return this.games.has(gameId);
  }
}

export const gameRegistry = new GameRegistry();
