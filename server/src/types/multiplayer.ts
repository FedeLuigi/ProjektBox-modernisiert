export interface Player {
  id: string; // Persistent user ID (e.g. usr_...)
  socketId: string;
  name: string;
  avatar: any;
  isReady: boolean;
  isHost: boolean;
  connected: boolean;
  color?: string; // 'red' | 'yellow' for Connect 4
  symbol?: string; // 'X' | 'O' for Tic Tac Toe
}

export type MultiplayerGameId = 'connect' | 'tic-tac-toe';

export interface BaseGameState {
  gameId: MultiplayerGameId;
  currentTurn: string; // Player ID whose turn it is
  status: 'playing' | 'won' | 'draw';
  winnerId: string | null;
  startedAt: number;
}

export interface TicTacToeState extends BaseGameState {
  gameId: 'tic-tac-toe';
  board: (string | null)[]; // 9 cells
  winningLine: number[] | null;
}

export interface ConnectFourState extends BaseGameState {
  gameId: 'connect';
  board: (string | null)[][]; // 6 rows x 7 cols
  winningCoords: { row: number; col: number }[] | null;
  lastDrop: { row: number; col: number } | null;
}

export type GameState = TicTacToeState | ConnectFourState;

export interface Lobby {
  id: string;
  code: string; // 5-character joining code (e.g. 7KP2M)
  name: string;
  isPrivate: boolean;
  gameId: MultiplayerGameId;
  maxPlayers: number;
  hostId: string;
  players: Player[];
  status: 'waiting' | 'in-game' | 'finished';
  createdAt: number;
  gameState: GameState | null;
  rematchVotes: string[]; // List of player IDs voting for rematch
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
