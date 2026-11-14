import type { ComponentType } from 'react';
import type { GameRendererProps } from './types';
import { TicTacToeBoard } from './components/TicTacToeBoard';
import { ConnectFourBoard } from './components/ConnectFourBoard';
import { DrawAndGuessBoard } from './components/DrawAndGuessBoard';
import { GenericDuelBoard } from './components/GenericDuelBoard';

export class ClientGameRegistry {
  private renderers = new Map<string, ComponentType<GameRendererProps<any, any>>>();

  constructor() {
    this.register('tic-tac-toe', TicTacToeBoard);
    this.register('connect', ConnectFourBoard);
    this.register('draw-and-guess', DrawAndGuessBoard);
  }

  public register(gameId: string, component: ComponentType<GameRendererProps<any, any>>): void {
    this.renderers.set(gameId, component);
  }

  public get(gameId: string): ComponentType<GameRendererProps<any, any>> {
    return this.renderers.get(gameId) || GenericDuelBoard;
  }

  public has(gameId: string): boolean {
    return this.renderers.has(gameId);
  }
}

export const clientGameRegistry = new ClientGameRegistry();
