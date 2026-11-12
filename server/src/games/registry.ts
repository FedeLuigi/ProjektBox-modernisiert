import { MultiplayerGameDefinition, Player } from '../types/multiplayer.js';
import { ticTacToeGame } from './definitions/ticTacToe.js';
import { connectFourGame } from './definitions/connectFour.js';
import { drawAndGuessGame } from './definitions/drawAndGuess.js';

function createStandardGame(id: string, title?: string, minPlayers = 1, maxPlayers = 4): MultiplayerGameDefinition {
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
    // Spezialisierte Multiplayer-Spiele
    this.register(ticTacToeGame);
    this.register(connectFourGame);
    this.register(drawAndGuessGame);

    // Einzelspiele (sofort solo oder ab 1 Spieler in der Lobby startbar)
    this.register(createStandardGame('memory', 'Memory', 1, 4));
    this.register(createStandardGame('reaction', 'Reaktions-Test', 1, 4));
    this.register(createStandardGame('snake', 'Snake', 1, 4));
    this.register(createStandardGame('2048', '2048', 1, 4));
    this.register(createStandardGame('minesweeper', 'Minenfeld', 1, 4));
    this.register(createStandardGame('space-dodge', 'Space Dodge', 1, 4));
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
