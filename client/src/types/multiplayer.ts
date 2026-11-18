import type { AvatarConfig } from '../components/Avatar';

export type PlayerConnectionState = 'connected' | 'disconnected' | 'offline';

export type LobbyStatus =
  | 'waiting'
  | 'starting'
  | 'in_progress'
  | 'paused'
  | 'finished'
  | 'expired';

export interface GameResultRecord {
  gameId: string;
  startedAt: number;
  finishedAt: number;
  status: 'won' | 'draw';
  winnerId: string | null;
  winnerName: string | null;
  scores?: Record<string, number>;
  players: Array<{ id: string; name: string; score?: number; eliminated?: boolean }>;
}

export interface Player {
  id: string;
  socketId: string;
  name: string;
  avatar: AvatarConfig;
  isReady: boolean;
  isHost: boolean;
  connected: boolean;
  connectionState?: PlayerConnectionState;
  disconnectedAt?: number;
  reconnectDeadline?: number;
  eliminated?: boolean;
  color?: string;
  symbol?: string;
  isTvScreen?: boolean;
  isBot?: boolean;
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
  status: LobbyStatus;
  stateVersion: number;
  createdAt: number;
  expiresAt: number;
  lastActivityAt?: number;
  pausedAt?: number;
  pausedReason?: string;
  hostDisconnectDeadline?: number;
  isTvMode?: boolean;
  isSimulated?: boolean;
  settings?: Record<string, any>;
  gameState: BaseGameState | null;
  rematchVotes: string[];
  finishedResults?: GameResultRecord[];
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
  status: LobbyStatus;
  stateVersion?: number;
  createdAt: number;
  expiresAt: number;
  isTvMode?: boolean;
  isSimulated?: boolean;
  settings?: Record<string, any>;
}
