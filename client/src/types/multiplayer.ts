import type { AvatarConfig } from '../components/Avatar';

export interface Player {
  id: string;
  socketId: string;
  name: string;
  avatar: AvatarConfig;
  isReady: boolean;
  isHost: boolean;
  connected: boolean;
  color?: string;
  symbol?: string;
  meta?: Record<string, any>;
}

export interface BaseGameState {
  gameId: string;
  currentTurn: string;
  status: 'playing' | 'won' | 'draw';
  winnerId: string | null;
  startedAt: number;
  [key: string]: any;
}

export interface Lobby {
  id: string;
  code: string;
  name: string;
  isPrivate: boolean;
  gameId: string;
  minPlayers: number;
  maxPlayers: number;
  hostId: string;
  players: Player[];
  status: 'waiting' | 'in-game' | 'finished';
  createdAt: number;
  gameState: BaseGameState | null;
  rematchVotes: string[];
}

export interface LobbySummary {
  id: string;
  code: string;
  name: string;
  isPrivate: boolean;
  gameId: string;
  minPlayers: number;
  maxPlayers: number;
  playerCount: number;
  hostName: string;
  status: 'waiting' | 'in-game' | 'finished';
  createdAt: number;
}
