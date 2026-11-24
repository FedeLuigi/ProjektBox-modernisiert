export type AvatarBase = 'human' | 'bot' | 'cat' | 'alien' | 'skull' | 'ninja' | 'custom';

export type AvatarHat =
  | 'none'
  | 'headset'
  | 'crown'
  | 'cap'
  | 'vr'
  | 'wizard'
  | 'devil_horns'
  | 'halo'
  | 'beanie';

export type AvatarAccessory =
  | 'none'
  | 'sunglasses'
  | 'pixel_shades'
  | 'laser_eyes'
  | 'blush'
  | 'eyepatch';

export type AvatarBg =
  | 'purple'
  | 'cyan'
  | 'sunset'
  | 'emerald'
  | 'gold'
  | 'dark';

export interface AvatarConfig {
  base: AvatarBase;
  skinColor: string;
  hat: AvatarHat;
  accessory: AvatarAccessory;
  bg: AvatarBg;
  customImage?: string;
  customId?: string;
}

export type PlayerAvatar = AvatarConfig | Record<string, any>;

export type ClientRole = 'tv' | 'smartphone';

export type NavSection = 'all' | 'duel' | 'party' | 'favorites' | 'recent';

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
  avatar: PlayerAvatar;
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
  isBot?: boolean; // Virtueller Simulations-Teilnehmer
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
  id: string;
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

export interface LobbySettings {
  rounds?: number;
  roundDuration?: number;
  category?: string;
  customWordsEnabled?: boolean;
  stopButtonEnabled?: boolean;
  categoryPreset?: 'klassisch' | 'party' | 'bunt';
  theme?: 'studio-open' | 'klassik-papier' | 'neon-quizshow' | 'minimal-editorial';
  startingBalance?: number;
  smallBlind?: number;
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
  settings?: LobbySettings;
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
  isSimulated?: boolean;
  settings?: LobbySettings;
}

export interface SessionInfoResponse {
  authenticated: boolean;
  sessionId?: string;
  playerId?: string;
  expiresAt?: number;
  sessionToken?: string;
  activeLobby?: Lobby | null;
}
