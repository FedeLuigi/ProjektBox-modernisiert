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
  id: string; // Eindeutige persistente Nutzer-ID (z. B. usr_...)
  socketId: string;
  name: string;
  avatar: any;
  isReady: boolean;
  isHost: boolean;
  connected: boolean;
  connectionState?: PlayerConnectionState;
  disconnectedAt?: number;
  reconnectDeadline?: number;
  eliminated?: boolean;
  sessionId?: string;
  color?: string;
  symbol?: string;
  isTvScreen?: boolean; // Kennzeichnung für Großbild-Fernseher
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

// ─── ZENTRALER MULTIPLAYER-SPIEL-VERTRAG (FÜR ALLE SPIELE) ───
export interface MultiplayerGameDefinition<TState = any, TMove = any> {
  id: string; // Eindeutige Spiel-ID (z. B. 'connect', 'tic-tac-toe', 'battleship', etc.)
  title: string;
  minPlayers: number;
  maxPlayers: number;

  // Initialen Spielstand beim Spielstart erstellen
  initGameState: (
    players: Player[],
    starterId?: string,
    settings?: Record<string, any>
  ) => TState;

  // Autoritative Zugvalidierung und Zustandsänderung auf dem Server
  validateAndApplyMove: (params: {
    state: TState;
    players: Player[];
    playerId: string;
    move: TMove;
  }) => { valid: boolean; error?: string; state: TState };

  // Optional: Hook beim Verlassen eines Spielers
  onPlayerLeave?: (state: TState, leavingPlayerId: string, remainingPlayers: Player[]) => TState;
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
  expiresAt: number; // Ablaufzeitpunkt der Lobby
  lastActivityAt?: number;
  pausedAt?: number;
  pausedReason?: string;
  hostDisconnectDeadline?: number;
  isTvMode?: boolean; // TV-Modus mit QR-Code
  settings?: Record<string, any>;
  gameState: BaseGameState | null;
  rematchVotes: string[];
  finishedResults?: GameResultRecord[];
  processedActionIds?: string[];
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
  settings?: Record<string, any>;
}
