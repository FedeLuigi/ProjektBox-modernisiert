import { MultiplayerGameDefinition, Player } from '../types/multiplayer.js';
import { ticTacToeGame } from './definitions/ticTacToe.js';
import { connectFourGame } from './definitions/connectFour.js';
import { drawAndGuessGame } from './definitions/drawAndGuess.js';

function createStandardGame(id: string, title?: string, minPlayers = 2, maxPlayers = 2): MultiplayerGameDefinition {
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
        newScores[playerId] = (newScores[playerId] || 0) + move.score;
      }
      return {
        valid: true,
        state: {
          ...state,
          currentTurn: nextPlayer.id,
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
    // Spezialisierte Multiplayer-Spiele
    this.register(ticTacToeGame);
    this.register(connectFourGame);
    this.register(drawAndGuessGame);

    // Standard-Registrierungen für alle weiteren Spiele der ProjektBox
    this.register(createStandardGame('memory', 'Memory'));
    this.register(createStandardGame('reaction', 'Reaktions-Test'));
    this.register(createStandardGame('snake', 'Snake'));
    this.register(createStandardGame('2048', '2048'));
    this.register(createStandardGame('minesweeper', 'Minenfeld'));
    this.register(createStandardGame('space-dodge', 'Space Dodge'));
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
    return true;
  }
}

export const gameRegistry = new GameRegistry();
