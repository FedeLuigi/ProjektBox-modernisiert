import { MultiplayerGameDefinition } from '../types/multiplayer.js';
import { ticTacToeGame } from './definitions/ticTacToe.js';
import { connectFourGame } from './definitions/connectFour.js';

export class GameRegistry {
  private games = new Map<string, MultiplayerGameDefinition<any, any>>();

  constructor() {
    // Standard-Multiplayer-Spiele registrieren
    this.register(ticTacToeGame);
    this.register(connectFourGame);
  }

  public register(game: MultiplayerGameDefinition<any, any>): void {
    this.games.set(game.id, game);
  }

  public get(gameId: string): MultiplayerGameDefinition<any, any> | undefined {
    return this.games.get(gameId);
  }

  public getAll(): MultiplayerGameDefinition<any, any>[] {
    return Array.from(this.games.values());
  }

  public has(gameId: string): boolean {
    return this.games.has(gameId);
  }
}

export const gameRegistry = new GameRegistry();
