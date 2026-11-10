import type { Player } from '../types/multiplayer';

export interface GameRendererProps<TState = any, TMove = any> {
  gameState: TState;
  myPlayer: Player;
  opponent?: Player;
  allPlayers: Player[];
  isMyTurn: boolean;
  isGameOver: boolean;
  onMove: (move: TMove) => void;
  disabled?: boolean;
}
