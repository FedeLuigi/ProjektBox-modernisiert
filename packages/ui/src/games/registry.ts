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

export function getGameStageBgClass(gameId: string): string {
  switch (gameId) {
    case 'draw-and-guess':
      return 'bg-[radial-gradient(circle_at_25%_20%,#1E293B_0%,#111827_58%,#090D16_100%)]';
    case 'stadt-land-fluss':
      return 'bg-[radial-gradient(circle_at_top,#1D3049_0%,#122033_65%,#0B1422_100%)]';
    case 'roulette':
      return 'bg-[radial-gradient(circle_at_center,#0D4A2E_0%,#062B1A_60%,#03150C_100%)]';
    case 'texas-holdem':
      return 'bg-[radial-gradient(circle_at_center,#2B131F_0%,#170A12_58%,#0A0408_100%)]';
    case 'gold-miner':
      return 'bg-[#7D563B]';
    case 'zombie-survival':
      return 'bg-[#070B12]';
    default:
      return 'bg-[#1B2B40]';
  }
}
