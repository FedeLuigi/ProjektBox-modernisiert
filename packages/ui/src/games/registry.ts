import type { ComponentType } from 'react';
import type { GameRendererProps } from './types';
import { DrawAndGuessBoard } from './components/DrawAndGuessBoard';
import { RouletteBoard } from './components/RouletteBoard';
import { StadtLandFlussBoard } from './components/StadtLandFlussBoard';
import { TexasHoldemBoard } from './components/TexasHoldemBoard';
import { ZombieSurvivalBoard } from './components/ZombieSurvivalBoard';
import { GenericDuelBoard } from './components/GenericDuelBoard';

export class ClientGameRegistry {
  private renderers = new Map<string, ComponentType<GameRendererProps<any, any>>>();

  constructor() {
    this.register('draw-and-guess', DrawAndGuessBoard);
    this.register('stadt-land-fluss', StadtLandFlussBoard);
    this.register('roulette', RouletteBoard);
    this.register('texas-holdem', TexasHoldemBoard);
    this.register('zombie-survival', ZombieSurvivalBoard);
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
