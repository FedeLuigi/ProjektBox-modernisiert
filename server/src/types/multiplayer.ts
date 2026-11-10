export interface Player {
  id: string; // Eindeutige persistente Nutzer-ID (z. B. usr_...)
  socketId: string;
  name: string;
  avatar: any;
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

// ─── ZENTRALER MULTIPLAYER-SPIEL-VERTRAG (FÜR ALLE SPIELE) ───
export interface MultiplayerGameDefinition<TState = any, TMove = any> {
  id: string; // Eindeutige Spiel-ID (z. B. 'connect', 'tic-tac-toe', 'battleship', etc.)
  title: string;
  minPlayers: number;
  maxPlayers: number;

  // Initialen Spielstand beim Spielstart erstellen
  initGameState: (players: Player[], starterId?: string) => TState;

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
