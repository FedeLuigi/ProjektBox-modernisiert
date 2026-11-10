import type { ComponentType } from 'react';
import type { GameRendererProps } from './types';
import { TicTacToeBoard } from './components/TicTacToeBoard';
import { ConnectFourBoard } from './components/ConnectFourBoard';

export class ClientGameRegistry {
  private renderers = new Map<string, ComponentType<GameRendererProps<any, any>>>();

  constructor() {
    this.register('tic-tac-toe', TicTacToeBoard);
    this.register('connect', ConnectFourBoard);
  }

  public register(gameId: string, component: ComponentType<GameRendererProps<any, any>>): void {
    this.renderers.set(gameId, component);
  }

  public get(gameId: string): ComponentType<GameRendererProps<any, any>> | undefined {
    return this.renderers.get(gameId);
  }

  public has(gameId: string): boolean {
    return this.renderers.has(gameId);
  }
}

export const clientGameRegistry = new ClientGameRegistry();
