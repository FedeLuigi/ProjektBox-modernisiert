import type { BaseGameState, Lobby, LobbyStatus, LobbySummary } from '../types/multiplayer.js';
import type { StrokeSegment } from '../types/games.js';

export const SOCKET_EVENTS = {
  SESSION_PING: 'session:ping',
  SESSION_PONG: 'session:pong',
  SESSION_EXPIRED: 'session:expired',

  LOBBY_LIST: 'lobby:list',
  LOBBY_LIST_UPDATED: 'lobby:list-updated',
  LOBBY_CREATE: 'lobby:create',
  LOBBY_SIMULATE: 'lobby:simulate',
  LOBBY_GET_BY_CODE: 'lobby:getByCode',
  LOBBY_JOIN: 'lobby:join',
  LOBBY_READY: 'lobby:ready',
  LOBBY_UPDATE_SETTINGS: 'lobby:update-settings',
  LOBBY_SWITCH_MODE: 'lobby:switch-mode',
  LOBBY_SWITCH_GAME: 'lobby:switch-game',
  LOBBY_UPDATE_PROFILE: 'lobby:update-profile',
  LOBBY_START: 'lobby:start',
  LOBBY_LEAVE: 'lobby:leave',
  LOBBY_RECONNECT: 'lobby:reconnect',
  LOBBY_UPDATED: 'lobby:updated',
  LOBBY_STATE_SYNC: 'lobby:state-sync',
  LOBBY_HOST_CHANGED: 'lobby:host-changed',
  LOBBY_PLAYER_DISCONNECTED: 'lobby:player-disconnected',
  LOBBY_PLAYER_OFFLINE: 'lobby:player-offline',
  LOBBY_EXPIRED: 'lobby:expired',

  GAME_MOVE: 'game:move',
  GAME_STARTED: 'game:started',
  GAME_STATE: 'game:state',
  GAME_REMATCH: 'game:rematch',
  GAME_RESTARTED: 'game:restarted',

  DRAW_STROKES: 'draw:strokes',
  DRAW_CLEAR: 'draw:clear',
  DRAW_UNDO: 'draw:undo',
  DRAW_LIVE_STROKES: 'draw:live-strokes',
  DRAW_LIVE_CLEAR: 'draw:live-clear',
  DRAW_LIVE_UNDO: 'draw:live-undo',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export interface LobbyAckResponse {
  success: boolean;
  lobby?: Lobby;
  reconnectToken?: string;
  duplicate?: boolean;
  error?: string;
}

export interface LobbyListAckResponse {
  success: boolean;
  lobbies?: LobbySummary[];
  error?: string;
}

export interface SessionPingResponse {
  serverTime: number;
  clientTime?: number;
  sessionValid: boolean;
}

export interface SessionExpiredPayload {
  reason: string;
  message: string;
}

export interface LobbyUpdatedPayload {
  lobby: Lobby;
  message?: string;
}

export interface LobbyStateSyncPayload {
  lobby: Lobby;
  reconnectToken?: string;
}

export interface LobbyHostChangedPayload {
  lobby: Lobby;
  newHostId: string;
  newHostName: string;
  previousHostId?: string;
  reason: string;
}

export interface LobbyPlayerDisconnectedPayload {
  playerId: string;
  playerName: string;
  reconnectDeadline?: number;
  lobby: Lobby;
}

export interface LobbyPlayerOfflinePayload {
  playerId: string;
  playerName: string;
  lobby: Lobby;
}

export interface LobbyExpiredPayload {
  lobbyId: string;
  code: string;
}

export interface GameStateBroadcastPayload {
  gameState: BaseGameState;
  status: LobbyStatus;
  lobby: Lobby;
}

export interface DrawLiveStrokesPayload {
  strokes: StrokeSegment[];
}

export interface DrawLiveUndoPayload {
  strokes: StrokeSegment[];
}

export interface ServerInfoResponse {
  hostname?: string;
  port?: number;
  localIps?: string[];
  isCloud?: boolean;
  renderUrl?: string | null;
  smartphoneUrl?: string | null;
  tvUrl?: string | null;
  databaseConnected?: boolean;
  uptimeSeconds?: number;
}
