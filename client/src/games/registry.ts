import type { ComponentType } from 'react';
import type { GameRendererProps } from './types';
import { TicTacToeBoard } from './components/TicTacToeBoard';
import { ConnectFourBoard } from './components/ConnectFourBoard';
import { DrawAndGuessBoard } from './components/DrawAndGuessBoard';
import { GenericDuelBoard } from './components/GenericDuelBoard';
import { ReactionBoard } from './components/ReactionBoard';
import { MemoryBoard } from './components/MemoryBoard';
import { Game2048Board } from './components/Game2048Board';
import { SnakeBoard } from './components/SnakeBoard';
import { MinesweeperBoard } from './components/MinesweeperBoard';
import { SpaceDodgeBoard } from './components/SpaceDodgeBoard';

export const SOLO_GAME_IDS = new Set([
  'memory',
  'reaction',
  'snake',
  '2048',
  'minesweeper',
  'space-dodge',
]);

export function isSoloGame(gameId?: string): boolean {
  return Boolean(gameId && SOLO_GAME_IDS.has(gameId));
}

export class ClientGameRegistry {
  private renderers = new Map<string, ComponentType<GameRendererProps<any, any>>>();

  constructor() {
    this.register('tic-tac-toe', TicTacToeBoard);
    this.register('connect', ConnectFourBoard);
    this.register('draw-and-guess', DrawAndGuessBoard);
    this.register('reaction', ReactionBoard);
    this.register('memory', MemoryBoard);
    this.register('2048', Game2048Board);
    this.register('snake', SnakeBoard);
    this.register('minesweeper', MinesweeperBoard);
    this.register('space-dodge', SpaceDodgeBoard);
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

export function isMultiplayerGame(game?: { id: string; players?: string }): boolean {
  if (!game) return true;
  return !isSoloGame(game.id);
}
