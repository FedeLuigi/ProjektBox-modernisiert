import { lazy, type ComponentType } from 'react';
import type { GameRendererProps } from './types';
import { GenericDuelBoard } from './components/GenericDuelBoard';

const DrawAndGuessBoard = lazy(() =>
  import('./components/DrawAndGuessBoard').then((m) => ({ default: m.DrawAndGuessBoard }))
);
const RouletteBoard = lazy(() =>
  import('./components/RouletteBoard').then((m) => ({ default: m.RouletteBoard }))
);
const StadtLandFlussBoard = lazy(() =>
  import('./components/StadtLandFlussBoard').then((m) => ({ default: m.StadtLandFlussBoard }))
);
const TexasHoldemBoard = lazy(() =>
  import('./components/TexasHoldemBoard').then((m) => ({ default: m.TexasHoldemBoard }))
);
const ZombieSurvivalBoard = lazy(() =>
  import('./components/ZombieSurvivalBoard').then((m) => ({ default: m.ZombieSurvivalBoard }))
);
const GoldMinerBoard = lazy(() =>
  import('./components/GoldMinerBoard').then((m) => ({ default: m.GoldMinerBoard }))
);

export class ClientGameRegistry {
  private renderers = new Map<string, ComponentType<GameRendererProps<any, any>>>();

  constructor() {
    this.register('draw-and-guess', DrawAndGuessBoard);
    this.register('stadt-land-fluss', StadtLandFlussBoard);
    this.register('roulette', RouletteBoard);
    this.register('texas-holdem', TexasHoldemBoard);
    this.register('zombie-survival', ZombieSurvivalBoard);
    this.register('gold-miner', GoldMinerBoard);
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
