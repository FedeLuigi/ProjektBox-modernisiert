import type { AvatarConfig } from '../components/Avatar';

export type MultiplayerGameId = 'connect' | 'tic-tac-toe';

export interface Player {
  id: string;
  socketId: string;
  name: string;
  avatar: AvatarConfig;
  isReady: boolean;
  isHost: boolean;
  connected: boolean;
  color?: string; // 'red' | 'yellow'
  symbol?: string; // 'X' | 'O'
}

export interface BaseGameState {
  gameId: MultiplayerGameId;
  currentTurn: string;
  status: 'playing' | 'won' | 'draw';
  winnerId: string | null;
  startedAt: number;
}

export interface TicTacToeState extends BaseGameState {
  gameId: 'tic-tac-toe';
  board: (string | null)[];
  winningLine: number[] | null;
}

export interface ConnectFourState extends BaseGameState {
  gameId: 'connect';
  board: (string | null)[][];
  winningCoords: { row: number; col: number }[] | null;
  lastDrop: { row: number; col: number } | null;
}

export type GameState = TicTacToeState | ConnectFourState;

export interface Lobby {
  id: string;
  code: string;
  name: string;
  isPrivate: boolean;
  gameId: MultiplayerGameId;
  maxPlayers: number;
  hostId: string;
  players: Player[];
  status: 'waiting' | 'in-game' | 'finished';
  createdAt: number;
  gameState: GameState | null;
  rematchVotes: string[];
}

export interface LobbySummary {
  id: string;
  code: string;
  name: string;
  isPrivate: boolean;
  gameId: MultiplayerGameId;
  maxPlayers: number;
  playerCount: number;
  hostName: string;
  status: 'waiting' | 'in-game' | 'finished';
  createdAt: number;
}
