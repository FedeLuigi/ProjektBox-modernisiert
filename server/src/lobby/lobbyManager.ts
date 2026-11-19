import crypto from 'node:crypto';
import path from 'node:path';
import {
  getDefaultGameSettings as getDefaultSettings,
  LOBBY_CODE_ALPHABET as CODE_CHARS,
} from '@projektbox/shared/utils';
import {
  BaseGameState,
  GameResultRecord,
  Lobby,
  LobbyStatus,
  LobbySummary,
  Player,
} from '../types/multiplayer.js';
import { gameRegistry } from '../games/registry.js';
import { SessionManager } from '../auth/sessionManager.js';
import {
  createDefaultPersistenceStore,
  type PersistenceStore,
} from '../database/persistenceStore.js';
import { StatePersistenceStore } from './stateStore.js';

const DEFAULT_LOBBY_EXPIRE_MS = 2 * 60 * 60 * 1000; // 2 Stunden Gültigkeit
const DEFAULT_RECONNECT_GRACE_MS = 60_000; // 60 Sekunden Reconnect-Frist
const DEFAULT_HOST_TRANSFER_GRACE_MS = 20_000; // 20 Sekunden Host-Ausfall-Frist
const DEFAULT_EMPTY_LOBBY_EXPIRE_MS = 5 * 60_000; // 5 Minuten für verwaiste Lobbys
const MAX_PROCESSED_ACTIONS = 250;

const SIMPLE_LOBBY_NAMES = [
  'Spielrunde',
  'Wohnzimmer',
  'Sofa-Runde',
  'Spieleabend',
  'Freundesrunde',
  'Partyraum',
  'Heimspiel',
  'Spielzimmer',
  'Treffpunkt',
  'Blitzrunde',
];

const SIMULATION_BOT_PRESETS = [
  {
    name: 'BOT LUCA',
    avatar: { base: 'bot', skinColor: '#38BDF8', hat: 'vr', accessory: 'pixel_shades', bg: 'cyan' },
    color: 'blue',
  },
  {
    name: 'BOT MIA',
    avatar: { base: 'cat', skinColor: '#FDDCB5', hat: 'crown', accessory: 'blush', bg: 'sunset' },
    color: 'pink',
  },
  {
    name: 'BOT KAI',
    avatar: { base: 'ninja', skinColor: '#22C55E', hat: 'headset', accessory: 'sunglasses', bg: 'emerald' },
    color: 'green',
  },
  {
    name: 'BOT LENA',
    avatar: { base: 'alien', skinColor: '#A855F7', hat: 'halo', accessory: 'laser_eyes', bg: 'purple' },
    color: 'purple',
  },
  {
    name: 'BOT TOM',
    avatar: { base: 'human', skinColor: '#D49B6A', hat: 'cap', accessory: 'none', bg: 'gold' },
    color: 'amber',
  },
] as const;

export interface LobbyManagerOptions {
  sessionManager?: SessionManager;
  stateStore?: PersistenceStore;
  reconnectGraceMs?: number;
  hostTransferGraceMs?: number;
  emptyLobbyExpireMs?: number;
  lobbyExpireMs?: number;
}

export interface LobbyManagerCallbacks {
  onPlayerExpired?: (lobby: Lobby, player: Player) => void;
  onHostChanged?: (
    lobby: Lobby,
    newHost: Player,
    previousHostId: string,
    reason: string
  ) => void;
  onLobbyUpdated?: (lobby: Lobby) => void;
  onLobbyExpired?: (lobby: Lobby) => void;
  onLobbyRemoved?: (lobbyId: string) => void;
}

export { getDefaultSettings };

export function sanitizeLobbyForClient(lobby: Lobby, viewerPlayerId?: string): Lobby {
  let safeGameState = lobby.gameState;

  // Geheime Pocket-Karten bei Texas Hold'em pro Empfänger schützen (Deck niemals senden)
  if (safeGameState && lobby.gameId === 'texas-holdem') {
    const rawHoleCards = (safeGameState.holeCards || {}) as Record<string, unknown>;
    const revealed = new Set<string>(
      Array.isArray(safeGameState.revealedPlayerIds) ? safeGameState.revealedPlayerIds : []
    );
    const filteredHoleCards: Record<string, unknown> = {};
    for (const [pid, cards] of Object.entries(rawHoleCards)) {
      if (pid === viewerPlayerId || revealed.has(pid)) {
        filteredHoleCards[pid] = cards;
      }
    }
    const { deck: _omitDeck, ...restState } = safeGameState;
    safeGameState = {
      ...restState,
      holeCards: filteredHoleCards,
    };
  }

  return {
    ...lobby,
    gameState: safeGameState,
    processedActionIds: undefined,
    players: lobby.players.map((p) => {
      const { sessionId: _omitSessionId, ...safePlayer } = p;
      return safePlayer;
    }),
  };
}

function getDefaultStateFilePath(): string {
  if (process.env.STATE_STORE_PATH) {
    return process.env.STATE_STORE_PATH;
  }
  const cwd = process.cwd();
  const baseDir = cwd.endsWith('server') ? path.join(cwd, 'data') : path.join(cwd, 'server', 'data');
  return path.join(baseDir, 'multiplayer-state.json');
}

export class LobbyManager {
  public readonly sessionManager: SessionManager;
  public readonly stateStore: PersistenceStore;
  public readonly reconnectGraceMs: number;
  public readonly hostTransferGraceMs: number;
  public readonly emptyLobbyExpireMs: number;
  public readonly lobbyExpireMs: number;

  private lobbies = new Map<string, Lobby>();
  private codeToLobbyId = new Map<string, string>();
  private playerToLobbyId = new Map<string, string>(); // playerId -> lobbyId
  private socketToPlayer = new Map<string, { lobbyId: string; playerId: string }>();
  private supersededSocketIds = new Set<string>();

  // Aktive Frist-Timer pro Lobby/Spieler
  private reconnectTimers = new Map<string, NodeJS.Timeout>(); // key: `${lobbyId}:${playerId}`
  private hostTransferTimers = new Map<string, NodeJS.Timeout>(); // key: lobbyId

  private callbacks: LobbyManagerCallbacks = {};

  constructor(options: LobbyManagerOptions = {}) {
    this.sessionManager = options.sessionManager ?? new SessionManager();
    this.stateStore =
      options.stateStore ??
      new StatePersistenceStore({
        disabled: true,
      });

    this.reconnectGraceMs =
      options.reconnectGraceMs ??
      (Number(process.env.RECONNECT_GRACE_MS) || DEFAULT_RECONNECT_GRACE_MS);
    this.hostTransferGraceMs =
      options.hostTransferGraceMs ??
      (Number(process.env.HOST_TRANSFER_GRACE_MS) || DEFAULT_HOST_TRANSFER_GRACE_MS);
    this.emptyLobbyExpireMs =
      options.emptyLobbyExpireMs ??
      (Number(process.env.EMPTY_LOBBY_EXPIRE_MS) || DEFAULT_EMPTY_LOBBY_EXPIRE_MS);
    this.lobbyExpireMs = options.lobbyExpireMs ?? DEFAULT_LOBBY_EXPIRE_MS;
  }

  public setCallbacks(callbacks: LobbyManagerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public async init(): Promise<{ restoredLobbies: number; restoredSessions: number }> {
    await this.stateStore.init();
    return this.restoreFromStore();
  }

  /**
   * Stellt Lobbys und Sitzungen nach einem Server-Neustart / Deployment wieder her.
   * Verbundene Spieler werden kontrolliert auf 'disconnected' mit frischer Reconnect-Frist gesetzt.
   */
  public async restoreFromStore(): Promise<{ restoredLobbies: number; restoredSessions: number }> {
    const snapshot = await this.stateStore.loadSnapshot();
    if (!snapshot) {
      return { restoredLobbies: 0, restoredSessions: 0 };
    }

    const restoredSessions = this.sessionManager.restoreSessions(snapshot.sessions || []);
    this.clearAllTimers();
    this.lobbies.clear();
    this.codeToLobbyId.clear();
    this.playerToLobbyId.clear();
    this.socketToPlayer.clear();

    const now = Date.now();
    let restoredLobbies = 0;

    for (const savedLobby of snapshot.lobbies || []) {
      if (!savedLobby?.id || savedLobby.status === 'expired' || now > savedLobby.expiresAt) {
        continue;
      }

      const activePlayerCount = savedLobby.players.filter(
        (p) => !p.isTvScreen && p.connectionState !== 'offline' && !p.eliminated
      ).length;
      if (activePlayerCount === 0 && (!savedLobby.finishedResults || savedLobby.finishedResults.length === 0)) {
        continue;
      }

      const lobby: Lobby = {
        ...savedLobby,
        players: savedLobby.players.map((p) => {
          // Nach Server-Neustart sind alle TCP-Sockets weg -> bisher verbundene Spieler bekommen Reconnect-Frist
          const wasOffline = p.connectionState === 'offline' || p.eliminated === true;
          if (wasOffline) {
            return {
              ...p,
              socketId: '',
              connected: false,
              connectionState: 'offline',
              reconnectDeadline: undefined,
            };
          }
          return {
            ...p,
            socketId: '',
            connected: false,
            connectionState: 'disconnected',
            disconnectedAt: p.disconnectedAt ?? now,
            reconnectDeadline: now + this.reconnectGraceMs,
          };
        }),
      };

      if (lobby.status === 'in_progress' || lobby.status === 'starting') {
        lobby.status = 'paused';
        lobby.pausedAt = now;
        lobby.pausedReason = 'Server-Neustart: Warte auf Wiederverbindung';
      }

      if (lobby.players.some((p) => p.isHost && p.connectionState === 'disconnected')) {
        lobby.hostDisconnectDeadline = now + this.hostTransferGraceMs;
        this.scheduleHostTransferTimer(lobby.id);
      }

      this.lobbies.set(lobby.id, lobby);
      this.codeToLobbyId.set(lobby.code.toUpperCase(), lobby.id);

      for (const p of lobby.players) {
        if (p.connectionState !== 'offline') {
          this.playerToLobbyId.set(p.id, lobby.id);
          this.scheduleReconnectTimer(lobby.id, p.id, this.reconnectGraceMs);
        }
      }

      restoredLobbies++;
    }

    this.sessionManager.cleanupExpiredSessions();
    this.cleanupExpiredLobbies();
    this.persistSnapshot();

    return { restoredLobbies, restoredSessions };
  }

  public isPlayerIdClaimedByAnotherSession(playerId: string, sessionId?: string): boolean {
    if (!playerId) return false;

    for (const lobby of this.lobbies.values()) {
      if (lobby.status === 'expired') continue;
      for (const p of lobby.players) {
        if (p.id === playerId && p.connectionState !== 'offline') {
          if (p.sessionId && p.sessionId !== sessionId) {
            return true;
          }
        }
      }
    }

    const existingLobbyId = this.playerToLobbyId.get(playerId);
    if (existingLobbyId) {
      const lobby = this.lobbies.get(existingLobbyId);
      const player = lobby?.players.find((p) => p.id === playerId);
      if (player?.sessionId && player.sessionId !== sessionId) {
        return true;
      }
    }

    return false;
  }

  public cleanupExpiredLobbies(): string[] {
    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [id, lobby] of this.lobbies.entries()) {
      const pastLifetime = now > lobby.expiresAt || lobby.status === 'expired';
      const activePlayers = lobby.players.filter((p) => p.connectionState !== 'offline');
      const connectedPlayers = lobby.players.filter(
        (p) => p.connected && p.connectionState === 'connected'
      );

      // Verwaiste/leere Lobby ohne verbundene oder wartende Spieler nach konfigurierbarer Frist schließen
      const lastActivity = lobby.lastActivityAt ?? lobby.createdAt;
      const staleEmpty =
        activePlayers.length === 0 && now - lastActivity >= this.emptyLobbyExpireMs;
      const staleDisconnectedOnly =
        connectedPlayers.length === 0 &&
        lobby.status === 'waiting' &&
        activePlayers.every(
          (p) =>
            p.connectionState === 'disconnected' &&
            p.reconnectDeadline !== undefined &&
            now > p.reconnectDeadline
        );

      if (pastLifetime || staleEmpty || staleDisconnectedOnly) {
        this.archiveCompletedGameIfNeeded(lobby);
        lobby.status = 'expired';
        expiredIds.push(id);
        this.removeLobbyIndexes(lobby);
        this.callbacks.onLobbyExpired?.(sanitizeLobbyForClient(lobby));
      }
    }

    this.sessionManager.cleanupExpiredSessions();

    if (expiredIds.length > 0) {
      this.persistSnapshot();
    }

    return expiredIds;
  }

  private generateUniqueCode(): string {
    for (let attempt = 0; attempt < 100; attempt++) {
      let code = '';
      for (let i = 0; i < 5; i++) {
        code += CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)];
      }
      if (!this.codeToLobbyId.has(code)) {
        return code;
      }
    }
    return crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
  }

  public getPublicLobbies(gameId?: string): LobbySummary[] {
    this.cleanupExpiredLobbies();
    const list: LobbySummary[] = [];

    for (const lobby of this.lobbies.values()) {
      if (lobby.isPrivate) continue;
      if (lobby.status === 'expired' || lobby.status === 'finished') continue;
      if (gameId && lobby.gameId !== gameId) continue;

      const host = lobby.players.find((p) => p.id === lobby.hostId);
      const visiblePlayerCount = lobby.players.filter(
        (p) => !p.isTvScreen && p.connectionState !== 'offline'
      ).length;

      list.push({
        id: lobby.id,
        code: lobby.code,
        name: lobby.name,
        isPrivate: lobby.isPrivate,
        gameId: lobby.gameId,
        minPlayers: lobby.minPlayers,
        maxPlayers: lobby.maxPlayers,
        playerCount: visiblePlayerCount,
        hostName: host?.name || 'Unbekannt',
        status: lobby.status,
        stateVersion: lobby.stateVersion,
        createdAt: lobby.createdAt,
        expiresAt: lobby.expiresAt,
        isTvMode: lobby.isTvMode,
        settings: lobby.settings,
      });
    }

    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  public getLobbyById(lobbyId: string): Lobby | undefined {
    return this.lobbies.get(lobbyId);
  }

  public getLobbyBySocket(socketId: string): Lobby | undefined {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return undefined;
    return this.lobbies.get(info.lobbyId);
  }

  public getLobbyBySocketId(socketId: string): Lobby | undefined {
    return this.getLobbyBySocket(socketId);
  }

  public getPlayerBySocket(socketId: string): Player | undefined {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return undefined;
    const lobby = this.lobbies.get(info.lobbyId);
    return lobby?.players.find((p) => p.id === info.playerId);
  }

  public getLobbyByPlayerId(playerId: string): Lobby | undefined {
    const lobbyId = this.playerToLobbyId.get(playerId);
    if (!lobbyId) return undefined;
    return this.lobbies.get(lobbyId);
  }

  public createLobby(params: {
    name?: string;
    isPrivate: boolean;
    gameId: string;
    userProfile: { id: string; name: string; avatar: any };
    socketId: string;
    isTvMode?: boolean;
    sessionId?: string;
  }): { success: boolean; lobby?: Lobby; error?: string; reconnectToken?: string } {
    const game = gameRegistry.get(params.gameId);
    if (!game) {
      return { success: false, error: `Spiel "${params.gameId}" nicht gefunden.` };
    }

    if (params.sessionId) {
      const session = this.sessionManager.getSessionById(params.sessionId);
      if (!session) {
        return { success: false, error: 'Ungültige oder abgelaufene Sitzung.' };
      }
      if (session.playerId !== params.userProfile.id) {
        return { success: false, error: 'Benutzer-ID stimmt nicht mit der Sitzung überein.' };
      }
    } else if (this.isPlayerIdClaimedByAnotherSession(params.userProfile.id)) {
      return { success: false, error: 'Benutzer-ID wird bereits von einer anderen Sitzung verwendet.' };
    }

    // Falls der Spieler bereits in einer anderen Lobby ist, diese sauber verlassen
    this.leaveCurrentLobby(params.socketId, params.userProfile.id);

    const now = Date.now();
    const id = `lob_${crypto.randomBytes(6).toString('hex')}`;
    const code = this.generateUniqueCode();
    const defaultLobbyName = `${SIMPLE_LOBBY_NAMES[crypto.randomInt(0, SIMPLE_LOBBY_NAMES.length)]} ${code}`;
    const name = params.name?.trim() || defaultLobbyName;

    const hostPlayer: Player = {
      id: params.userProfile.id,
      socketId: params.socketId,
      name: params.userProfile.name,
      avatar: params.userProfile.avatar,
      isReady: Boolean(params.isTvMode),
      isHost: true,
      connected: true,
      connectionState: 'connected',
      eliminated: false,
      sessionId: params.sessionId,
      color: 'red',
      symbol: 'X',
      isTvScreen: Boolean(params.isTvMode),
    };

    const lobby: Lobby = {
      id,
      code,
      name,
      isPrivate: params.isPrivate,
      gameId: params.gameId,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      hostId: hostPlayer.id,
      players: [hostPlayer],
      status: 'waiting',
      stateVersion: 1,
      createdAt: now,
      expiresAt: now + this.lobbyExpireMs,
      lastActivityAt: now,
      isTvMode: Boolean(params.isTvMode),
      settings: getDefaultSettings(params.gameId),
      gameState: null,
      rematchVotes: [],
      finishedResults: [],
      processedActionIds: [],
    };

    this.lobbies.set(id, lobby);
    this.codeToLobbyId.set(code, id);
    this.playerToLobbyId.set(hostPlayer.id, id);
    this.socketToPlayer.set(params.socketId, { lobbyId: id, playerId: hostPlayer.id });

    let reconnectToken: string | undefined;
    if (params.sessionId) {
      this.sessionManager.setLobbyBinding(params.sessionId, id, code);
      this.sessionManager.bindSocket(params.sessionId, params.socketId);
      reconnectToken = this.sessionManager.rotateReconnectToken(params.sessionId) ?? undefined;
    }

    this.persistSnapshot();
    return { success: true, lobby, reconnectToken };
  }

  public createAndStartSimulatedLobby(params: {
    gameId: string;
    userProfile: { id: string; name: string; avatar: any };
    socketId: string;
    isTvMode?: boolean;
    botCount?: number;
    settings?: Record<string, any>;
    sessionId?: string;
  }): { success: boolean; lobby?: Lobby; error?: string; reconnectToken?: string } {
    const game = gameRegistry.get(params.gameId);
    if (!game) {
      return { success: false, error: `Unbekanntes Spiel: ${params.gameId}` };
    }

    if (params.sessionId) {
      const session = this.sessionManager.getSessionById(params.sessionId);
      if (!session) {
        return { success: false, error: 'Ungültige oder abgelaufene Sitzung.' };
      }
      if (session.playerId !== params.userProfile.id) {
        return { success: false, error: 'Benutzer-ID stimmt nicht mit der Sitzung überein.' };
      }
    } else if (this.isPlayerIdClaimedByAnotherSession(params.userProfile.id)) {
      return { success: false, error: 'Benutzer-ID wird bereits von einer anderen Sitzung verwendet.' };
    }

    // Falls der Spieler bereits in einer anderen Lobby ist, diese sauber verlassen
    this.leaveCurrentLobby(params.socketId, params.userProfile.id);

    const isTv = Boolean(params.isTvMode);
    const minBotsNeeded = isTv ? Math.max(2, game.minPlayers) : Math.max(0, game.minPlayers - 1);
    const maxBotsAllowed = isTv ? game.maxPlayers : Math.max(0, game.maxPlayers - 1);
    const requestedBots = typeof params.botCount === 'number' ? Math.floor(params.botCount) : 2;
    const resolvedBots = Math.min(maxBotsAllowed, Math.max(minBotsNeeded, requestedBots));

    const now = Date.now();
    const id = `lob_${crypto.randomBytes(6).toString('hex')}`;
    const code = this.generateUniqueCode();

    const hostPlayer: Player = {
      id: params.userProfile.id,
      socketId: params.socketId,
      name: params.userProfile.name,
      avatar: params.userProfile.avatar,
      isReady: true,
      isHost: true,
      connected: true,
      connectionState: 'connected',
      eliminated: false,
      sessionId: params.sessionId,
      color: 'red',
      symbol: 'X',
      isTvScreen: isTv,
      isBot: false,
    };

    const botPlayers: Player[] = Array.from({ length: resolvedBots }, (_, idx) => {
      const preset = SIMULATION_BOT_PRESETS[idx % SIMULATION_BOT_PRESETS.length];
      return {
        id: `bot_${id}_${idx + 1}`,
        socketId: '',
        name: preset.name,
        avatar: { ...preset.avatar },
        isReady: true,
        isHost: false,
        connected: true,
        connectionState: 'connected',
        eliminated: false,
        color: preset.color,
        symbol: 'O',
        isTvScreen: false,
        isBot: true,
      };
    });

    const lobby: Lobby = {
      id,
      code,
      name: `Simulation ${code}`,
      isPrivate: true,
      isSimulated: true,
      gameId: params.gameId,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      hostId: hostPlayer.id,
      players: [hostPlayer, ...botPlayers],
      status: 'waiting',
      stateVersion: 1,
      createdAt: now,
      expiresAt: now + this.lobbyExpireMs,
      lastActivityAt: now,
      isTvMode: isTv,
      settings: {
        ...getDefaultSettings(params.gameId),
        ...(params.settings || {}),
      },
      gameState: null,
      rematchVotes: [],
      finishedResults: [],
      processedActionIds: [],
    };

    this.lobbies.set(id, lobby);
    this.codeToLobbyId.set(code, id);
    this.playerToLobbyId.set(hostPlayer.id, id);
    this.socketToPlayer.set(params.socketId, { lobbyId: id, playerId: hostPlayer.id });

    let reconnectToken: string | undefined;
    if (params.sessionId) {
      this.sessionManager.setLobbyBinding(params.sessionId, id, code);
      this.sessionManager.bindSocket(params.sessionId, params.socketId);
      reconnectToken = this.sessionManager.rotateReconnectToken(params.sessionId) ?? undefined;
    }

    const started = this.startGame({
      lobbyId: id,
      playerId: hostPlayer.id,
    });
    if (!started.success || !started.lobby) {
      this.removeLobbyIndexes(lobby);
      return { success: false, error: started.error || 'Simulation konnte nicht gestartet werden.' };
    }

    return { success: true, lobby: started.lobby, reconnectToken };
  }

  public findLobbyByCode(code: string): Lobby | undefined {
    this.cleanupExpiredLobbies();
    const normalized = code.trim().toUpperCase();
    const lobbyId = this.codeToLobbyId.get(normalized);
    if (!lobbyId) return undefined;
    return this.lobbies.get(lobbyId);
  }

  public joinLobby(params: {
    lobbyIdOrCode: string;
    userProfile: { id: string; name: string; avatar: any };
    socketId: string;
    sessionId?: string;
  }): {
    success: boolean;
    lobby?: Lobby;
    error?: string;
    reconnectToken?: string;
    supersededSocketId?: string;
  } {
    this.cleanupExpiredLobbies();

    if (params.sessionId) {
      const session = this.sessionManager.getSessionById(params.sessionId);
      if (!session) {
        return { success: false, error: 'Sitzung ungültig oder abgelaufen.' };
      }
      if (session.playerId !== params.userProfile.id) {
        return { success: false, error: 'Keine Berechtigung für diese Benutzer-ID.' };
      }
    } else if (this.isPlayerIdClaimedByAnotherSession(params.userProfile.id)) {
      return { success: false, error: 'Benutzer-ID gehört zu einer anderen aktiven Sitzung.' };
    }

    const input = params.lobbyIdOrCode.trim();
    let lobby = this.lobbies.get(input);
    if (!lobby) {
      lobby = this.findLobbyByCode(input);
    }

    if (!lobby || lobby.status === 'expired') {
      return { success: false, error: 'Lobby wurde nicht gefunden oder ist abgelaufen.' };
    }

    const existingPlayer = lobby.players.find((p) => p.id === params.userProfile.id);
    if (!existingPlayer && lobby.isSimulated) {
      return { success: false, error: 'Dies ist eine geschlossene Test-Simulation.' };
    }
    if (existingPlayer) {
      // Abgelaufene / ausgeschlossene Spieler dürfen einer laufenden Lobby nicht wieder beitreten
      if (existingPlayer.connectionState === 'offline' || existingPlayer.eliminated) {
        return {
          success: false,
          error: 'Deine Reconnect-Frist ist abgelaufen. Ein erneuter Beitritt ist nicht möglich.',
        };
      }

      // Fremde Session darf sich nicht als vorhandener Spieler einloggen
      if (
        existingPlayer.sessionId &&
        params.sessionId &&
        existingPlayer.sessionId !== params.sessionId
      ) {
        return {
          success: false,
          error: 'Identitätsprüfung fehlgeschlagen: Spieler gehört zu einer anderen Sitzung.',
        };
      }

      const supersededSocketId =
        existingPlayer.socketId && existingPlayer.socketId !== params.socketId
          ? existingPlayer.socketId
          : undefined;

      this.clearReconnectTimer(lobby.id, existingPlayer.id);
      if (existingPlayer.isHost) {
        this.clearHostTransferTimer(lobby.id);
        lobby.hostDisconnectDeadline = undefined;
      }

      if (supersededSocketId) {
        this.socketToPlayer.delete(supersededSocketId);
        this.supersededSocketIds.add(supersededSocketId);
      }

      existingPlayer.socketId = params.socketId;
      existingPlayer.connected = true;
      existingPlayer.connectionState = 'connected';
      existingPlayer.disconnectedAt = undefined;
      existingPlayer.reconnectDeadline = undefined;
      existingPlayer.name = params.userProfile.name;
      existingPlayer.avatar = params.userProfile.avatar;
      if (params.sessionId) {
        existingPlayer.sessionId = params.sessionId;
      }

      this.maybeResumePausedLobby(lobby);
      lobby.stateVersion += 1;
      lobby.lastActivityAt = Date.now();

      this.playerToLobbyId.set(existingPlayer.id, lobby.id);
      this.socketToPlayer.set(params.socketId, {
        lobbyId: lobby.id,
        playerId: existingPlayer.id,
      });

      let reconnectToken: string | undefined;
      if (params.sessionId) {
        this.sessionManager.setLobbyBinding(params.sessionId, lobby.id, lobby.code);
        this.sessionManager.bindSocket(params.sessionId, params.socketId);
        reconnectToken = this.sessionManager.rotateReconnectToken(params.sessionId) ?? undefined;
      }

      this.persistSnapshot();
      return { success: true, lobby, reconnectToken, supersededSocketId };
    }

    if (lobby.status !== 'waiting') {
      return { success: false, error: 'Das Spiel läuft bereits oder ist beendet.' };
    }

    const activePlayers = lobby.players.filter(
      (p) => !p.isTvScreen && p.connectionState !== 'offline'
    );
    if (activePlayers.length >= lobby.maxPlayers) {
      return { success: false, error: 'Lobby ist bereits voll.' };
    }

    const currentLobby = this.getLobbyBySocket(params.socketId);
    if (currentLobby && currentLobby.id !== lobby.id) {
      this.leaveCurrentLobby(params.socketId, params.userProfile.id);
    }

    const COLORS = ['blue', 'yellow', 'emerald', 'purple', 'orange', 'pink', 'cyan'];
    const SYMBOLS = ['O', '△', '□', '☆', '◇', '♣', '♠'];
    const usedColors = new Set(lobby.players.map((p) => p.color));
    const usedSymbols = new Set(lobby.players.map((p) => p.symbol));
    const nextColor = COLORS.find((c) => !usedColors.has(c)) || 'blue';
    const nextSymbol = SYMBOLS.find((s) => !usedSymbols.has(s)) || 'O';

    const newPlayer: Player = {
      id: params.userProfile.id,
      socketId: params.socketId,
      name: params.userProfile.name,
      avatar: params.userProfile.avatar,
      isReady: false,
      isHost: false,
      connected: true,
      connectionState: 'connected',
      eliminated: false,
      sessionId: params.sessionId,
      color: nextColor,
      symbol: nextSymbol,
    };

    lobby.players.push(newPlayer);
    lobby.stateVersion += 1;
    lobby.lastActivityAt = Date.now();
    lobby.expiresAt = Date.now() + this.lobbyExpireMs;

    this.playerToLobbyId.set(newPlayer.id, lobby.id);
    this.socketToPlayer.set(params.socketId, { lobbyId: lobby.id, playerId: newPlayer.id });

    let reconnectToken: string | undefined;
    if (params.sessionId) {
      this.sessionManager.setLobbyBinding(params.sessionId, lobby.id, lobby.code);
      this.sessionManager.bindSocket(params.sessionId, params.socketId);
      reconnectToken = this.sessionManager.rotateReconnectToken(params.sessionId) ?? undefined;
    }

    this.persistSnapshot();
    return { success: true, lobby, reconnectToken };
  }

  private resolveActionTarget(
    target:
      | string
      | { lobbyId: string; playerId: string; actionId?: string; expectedVersion?: number }
  ): { lobbyId: string; playerId: string; actionId?: string; expectedVersion?: number } | null {
    if (typeof target === 'string') {
      const info = this.socketToPlayer.get(target);
      if (!info) return null;
      return { lobbyId: info.lobbyId, playerId: info.playerId };
    }
    return target;
  }

  public toggleReady(
    socketIdOrParams:
      | string
      | { lobbyId: string; playerId: string; actionId?: string; expectedVersion?: number }
  ): { success: boolean; lobby?: Lobby; duplicate?: boolean; error?: string } {
    const resolved = this.resolveActionTarget(socketIdOrParams);
    if (!resolved) return { success: false, error: 'Nicht in einer Lobby.' };
    const { lobbyId, playerId, actionId, expectedVersion } = resolved;

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return { success: false, error: 'Lobby nicht gefunden.' };
    if (lobby.status !== 'waiting' && lobby.status !== 'finished') {
      return { success: false, error: 'Bereit-Status kann im laufenden Spiel nicht geändert werden.' };
    }

    if (actionId && this.isDuplicateAction(lobby, actionId)) {
      return { success: true, duplicate: true, lobby };
    }
    if (expectedVersion !== undefined && expectedVersion !== lobby.stateVersion) {
      return { success: false, error: 'Veraltete Aktion: Zustand wurde zwischenzeitlich geändert.' };
    }

    const player = lobby.players.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'Spieler nicht in Lobby.' };
    if (player.connectionState === 'offline') {
      return { success: false, error: 'Abgelaufene Spieler können keinen Status ändern.' };
    }

    player.isReady = !player.isReady;
    this.recordActionId(lobby, actionId);
    lobby.stateVersion += 1;
    lobby.lastActivityAt = Date.now();
    this.persistSnapshot();
    return { success: true, lobby };
  }

  public updateSettings(
    socketIdOrParams:
      | string
      | {
          lobbyId: string;
          playerId: string;
          settings: Record<string, any>;
          actionId?: string;
          expectedVersion?: number;
        },
    explicitSettings?: Record<string, any>
  ): { success: boolean; lobby?: Lobby; duplicate?: boolean; error?: string } {
    const resolved = this.resolveActionTarget(socketIdOrParams);
    if (!resolved) return { success: false, error: 'Nicht in einer Lobby.' };
    const settings =
      typeof socketIdOrParams === 'string'
        ? explicitSettings ?? {}
        : socketIdOrParams.settings;
    const { lobbyId, playerId, actionId, expectedVersion } = resolved;

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return { success: false, error: 'Lobby nicht gefunden.' };
    if (lobby.hostId !== playerId) {
      return { success: false, error: 'Nur der aktuelle Host darf Einstellungen ändern.' };
    }
    if (lobby.status !== 'waiting' && lobby.status !== 'finished') {
      return { success: false, error: 'Einstellungen können während des Spiels nicht geändert werden.' };
    }

    if (actionId && this.isDuplicateAction(lobby, actionId)) {
      return { success: true, duplicate: true, lobby };
    }
    if (expectedVersion !== undefined && expectedVersion !== lobby.stateVersion) {
      return { success: false, error: 'Veraltete Aktion: Lobby-Zustand ist nicht mehr aktuell.' };
    }

    lobby.settings = {
      ...(lobby.settings || getDefaultSettings(lobby.gameId)),
      ...settings,
    };

    this.recordActionId(lobby, actionId);
    lobby.stateVersion += 1;
    lobby.lastActivityAt = Date.now();
    this.persistSnapshot();
    return { success: true, lobby };
  }

  public switchLobbyMode(params: {
    lobbyId: string;
    playerId: string;
    isTvMode: boolean;
    actionId?: string;
    expectedVersion?: number;
  }): { success: boolean; lobby?: Lobby; duplicate?: boolean; error?: string } {
    const lobby = this.lobbies.get(params.lobbyId);
    if (!lobby) return { success: false, error: 'Lobby nicht gefunden.' };
    if (lobby.hostId !== params.playerId) {
      return { success: false, error: 'Nur der aktuelle Host darf den Modus wechseln.' };
    }
    if (lobby.status !== 'waiting') {
      return { success: false, error: 'Moduswechsel ist nur vor Spielstart möglich.' };
    }

    if (params.actionId && this.isDuplicateAction(lobby, params.actionId)) {
      return { success: true, duplicate: true, lobby };
    }
    if (params.expectedVersion !== undefined && params.expectedVersion !== lobby.stateVersion) {
      return { success: false, error: 'Veraltete Aktion: Lobby-Zustand hat sich geändert.' };
    }

    const otherGuests = lobby.players.filter(
      (p) => !p.isTvScreen && p.id !== params.playerId && p.connectionState !== 'offline'
    );
    if (otherGuests.length > 0) {
      return {
        success: false,
        error: 'Moduswechsel nur möglich, solange keine weiteren Mitspieler beigetreten sind.',
      };
    }

    const hostPlayer = lobby.players.find((p) => p.id === params.playerId);
    if (!hostPlayer) return { success: false, error: 'Host-Spieler nicht in Lobby.' };

    lobby.isTvMode = params.isTvMode;
    hostPlayer.isTvScreen = params.isTvMode;
    hostPlayer.isReady = params.isTvMode;

    this.recordActionId(lobby, params.actionId);
    lobby.stateVersion += 1;
    lobby.lastActivityAt = Date.now();
    this.persistSnapshot();

    return { success: true, lobby };
  }

  public startGame(
    socketIdOrParams:
      | string
      | { lobbyId: string; playerId: string; actionId?: string; expectedVersion?: number }
  ): { success: boolean; lobby?: Lobby; duplicate?: boolean; error?: string } {
    const resolved = this.resolveActionTarget(socketIdOrParams);
    if (!resolved) return { success: false, error: 'Nicht in einer Lobby.' };
    const { lobbyId, playerId, actionId, expectedVersion } = resolved;

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return { success: false, error: 'Lobby nicht gefunden.' };
    if (lobby.hostId !== playerId) {
      return { success: false, error: 'Nur der Host darf das Spiel starten.' };
    }

    if (actionId && this.isDuplicateAction(lobby, actionId)) {
      return { success: true, duplicate: true, lobby };
    }

    if (lobby.status !== 'waiting' && lobby.status !== 'finished') {
      return { success: false, error: 'Spiel läuft bereits oder befindet sich in einer Übergangsphase.' };
    }

    if (expectedVersion !== undefined && expectedVersion !== lobby.stateVersion) {
      return { success: false, error: 'Veraltete Start-Aktion: Bitte aktualisiere zuerst die Lobby.' };
    }

    const activePlayers = lobby.players.filter(
      (p) => !p.isTvScreen && p.connectionState === 'connected' && p.connected
    );
    if (activePlayers.length < lobby.minPlayers) {
      return {
        success: false,
        error: `Mindestens ${lobby.minPlayers} verbundene Spieler erforderlich.`,
      };
    }

    const unreadyGuest = activePlayers.find((p) => !p.isHost && !p.isReady);
    if (unreadyGuest) {
      return {
        success: false,
        error: `${unreadyGuest.name} ist noch nicht bereit.`,
      };
    }

    const game = gameRegistry.get(lobby.gameId);
    if (!game) {
      return { success: false, error: 'Spielmodul nicht gefunden.' };
    }

    // Übergang: waiting -> starting -> in_progress
    lobby.status = 'starting';
    const starter = activePlayers[0];

    for (const p of lobby.players) {
      if (p.connectionState === 'connected' && p.connected) {
        p.eliminated = false;
      }
    }

    lobby.gameState = game.initGameState(activePlayers, starter.id, lobby.settings);
    lobby.status = 'in_progress';
    lobby.pausedAt = undefined;
    lobby.pausedReason = undefined;
    lobby.rematchVotes = [];
    this.recordActionId(lobby, actionId);
    lobby.stateVersion += 1;
    lobby.lastActivityAt = Date.now();
    lobby.expiresAt = Date.now() + this.lobbyExpireMs;

    this.persistSnapshot();
    return { success: true, lobby };
  }

  public makeMove(
    socketIdOrParams:
      | string
      | {
          lobbyId: string;
          playerId: string;
          move: any;
          actionId?: string;
          expectedVersion?: number;
        },
    explicitMove?: any
  ): { success: boolean; lobby?: Lobby; duplicate?: boolean; error?: string } {
    const resolved = this.resolveActionTarget(socketIdOrParams);
    if (!resolved) return { success: false, error: 'Nicht in einer Lobby.' };
    const move =
      typeof socketIdOrParams === 'string' ? explicitMove : socketIdOrParams.move;
    const { lobbyId, playerId, actionId, expectedVersion } = resolved;

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby || !lobby.gameState) {
      return { success: false, error: 'Kein aktives Spiel gefunden.' };
    }

    if (actionId && this.isDuplicateAction(lobby, actionId)) {
      return { success: true, duplicate: true, lobby };
    }

    if (lobby.status === 'paused') {
      return {
        success: false,
        error: 'Spiel ist pausiert, während auf eine Wiederverbindung gewartet wird.',
      };
    }

    if (lobby.status !== 'in_progress') {
      return { success: false, error: 'Das Spiel läuft aktuell nicht.' };
    }

    if (lobby.gameState.status !== 'playing') {
      return { success: false, error: 'Das Spiel ist bereits beendet.' };
    }

    const player = lobby.players.find((p) => p.id === playerId);
    if (!player || player.connectionState === 'offline' || player.eliminated) {
      return { success: false, error: 'Spieler ist in diesem Spiel nicht aktiv.' };
    }

    const isSimultaneousPartyGame =
      lobby.gameId === 'draw-and-guess' ||
      lobby.gameId === 'stadt-land-fluss' ||
      lobby.gameId === 'roulette';
    const isPokerSimultaneousAction =
      lobby.gameId === 'texas-holdem' &&
      (move?.type === 'next_round' || move?.type === 'time_up');
    const isStructuralOrTurnAction =
      (!isSimultaneousPartyGame && !isPokerSimultaneousAction) ||
      (lobby.gameId === 'draw-and-guess' &&
        (move?.type === 'set_word' ||
          move?.type === 'next_round' ||
          move?.type === 'time_up' ||
          move?.type === 'clear' ||
          move?.type === 'undo'));

    if (
      expectedVersion !== undefined &&
      isStructuralOrTurnAction &&
      expectedVersion !== lobby.stateVersion
    ) {
      return {
        success: false,
        error: 'Veraltete Aktion: Der Spielzustand hat sich bereits weiterentwickelt.',
      };
    }

    const game = gameRegistry.get(lobby.gameId);
    if (!game) return { success: false, error: 'Spielmodul nicht gefunden.' };

    const activePlayers = lobby.players.filter(
      (p) => !p.isTvScreen && !p.eliminated && p.connectionState !== 'offline'
    );

    const prevGameState = lobby.gameState;
    const result = game.validateAndApplyMove({
      state: lobby.gameState,
      players: activePlayers,
      playerId,
      move,
    });

    if (!result.valid) {
      return { success: false, error: result.error || 'Ungültiger Spielzug.' };
    }

    const nextState = result.state;
    lobby.gameState = nextState;
    this.recordActionId(lobby, actionId);
    lobby.stateVersion += 1;
    lobby.lastActivityAt = Date.now();

    if (nextState.status === 'won' || nextState.status === 'draw') {
      lobby.status = 'finished';
      this.archiveCompletedGameIfNeeded(lobby);
    }

    const shouldPersistMilestone =
      lobby.status === 'finished' ||
      (!isSimultaneousPartyGame) ||
      nextState.round !== prevGameState.round ||
      nextState.handNumber !== prevGameState.handNumber ||
      nextState.roundStatus !== prevGameState.roundStatus ||
      nextState.phase !== prevGameState.phase ||
      nextState.correctGuesserIds?.length !== prevGameState.correctGuesserIds?.length ||
      nextState.submittedPlayerIds?.length !== prevGameState.submittedPlayerIds?.length ||
      nextState.lockedPlayerIds?.length !== prevGameState.lockedPlayerIds?.length;

    if (shouldPersistMilestone) {
      this.persistSnapshot();
    }

    return { success: true, lobby };
  }

  public requestRematch(
    socketIdOrParams:
      | string
      | { lobbyId: string; playerId: string; actionId?: string; expectedVersion?: number }
  ): { success: boolean; lobby?: Lobby; restarted?: boolean; duplicate?: boolean; error?: string } {
    const resolved = this.resolveActionTarget(socketIdOrParams);
    if (!resolved) return { success: false, error: 'Nicht in einer Lobby.' };
    const { lobbyId, playerId, actionId, expectedVersion } = resolved;

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return { success: false, error: 'Lobby nicht gefunden.' };
    if (lobby.status !== 'finished') {
      return { success: false, error: 'Spiel ist noch nicht beendet.' };
    }

    if (actionId && this.isDuplicateAction(lobby, actionId)) {
      return { success: true, duplicate: true, restarted: false, lobby };
    }
    if (expectedVersion !== undefined && expectedVersion !== lobby.stateVersion) {
      return { success: false, error: 'Veraltete Rematch-Anfrage.' };
    }

    const activePlayers = lobby.players.filter(
      (p) => !p.isTvScreen && p.connectionState === 'connected' && p.connected
    );
    const requester = lobby.players.find((p) => p.id === playerId);
    const isTvHostSim = Boolean(lobby.isSimulated && lobby.isTvMode && requester?.isTvScreen);

    if (!activePlayers.some((p) => p.id === playerId) && !isTvHostSim) {
      return { success: false, error: 'Nicht berechtigt für Rematch.' };
    }

    if (!isTvHostSim && !lobby.rematchVotes.includes(playerId)) {
      lobby.rematchVotes.push(playerId);
    }

    if (lobby.isSimulated) {
      for (const p of activePlayers) {
        if (p.isBot && !lobby.rematchVotes.includes(p.id)) {
          lobby.rematchVotes.push(p.id);
        }
      }
    }

    const requiredVotes = lobby.isSimulated ? activePlayers.length : Math.min(2, activePlayers.length);
    let restarted = false;

    if (lobby.rematchVotes.length >= requiredVotes && activePlayers.length >= lobby.minPlayers) {
      const game = gameRegistry.get(lobby.gameId);
      if (game) {
        lobby.status = 'starting';
        const starterIndex = Math.floor(Math.random() * activePlayers.length);
        for (const p of lobby.players) {
          if (p.connectionState === 'connected' && p.connected) {
            p.eliminated = false;
          }
        }
        lobby.gameState = game.initGameState(
          activePlayers,
          activePlayers[starterIndex].id,
          lobby.settings
        );
        lobby.status = 'in_progress';
        lobby.pausedAt = undefined;
        lobby.pausedReason = undefined;
        lobby.rematchVotes = [];
        restarted = true;
      }
    }

    this.recordActionId(lobby, actionId);
    lobby.stateVersion += 1;
    lobby.lastActivityAt = Date.now();
    this.persistSnapshot();

    return { success: true, lobby, restarted };
  }

  public updatePlayerProfile(
    socketId: string,
    userProfile: { id: string; name: string; avatar: any }
  ): { lobby?: Lobby; player?: Player; error?: string } {
    const info = this.socketToPlayer.get(socketId);
    if (!info) return { error: 'Nicht in einer Lobby.' };

    const lobby = this.lobbies.get(info.lobbyId);
    if (!lobby) return { error: 'Lobby nicht gefunden.' };

    if (userProfile.id !== info.playerId) {
      return { error: 'Benutzer-ID kann nicht auf einen anderen Spieler geändert werden.' };
    }

    const player = lobby.players.find((p) => p.id === info.playerId);
    if (!player) return { error: 'Spieler nicht in Lobby.' };

    player.name = userProfile.name;
    player.avatar = userProfile.avatar;
    lobby.stateVersion += 1;
    lobby.lastActivityAt = Date.now();
    this.persistSnapshot();

    return { lobby, player };
  }

  public leaveCurrentLobby(
    socketId: string,
    explicitPlayerId?: string
  ): {
    lobbyId?: string;
    lobby?: Lobby;
    deleted?: boolean;
    wasHost?: boolean;
    leftLobby?: Lobby;
    lobbyDeleted?: boolean;
    leavingPlayerId?: string;
    newHost?: Player;
    previousHostId?: string;
  } {
    const info = socketId ? this.socketToPlayer.get(socketId) : undefined;
    const playerId = info?.playerId ?? explicitPlayerId;
    const lobbyId = info?.lobbyId ?? (playerId ? this.playerToLobbyId.get(playerId) : undefined);

    if (socketId) {
      this.socketToPlayer.delete(socketId);
    }

    if (!lobbyId || !playerId) {
      return {};
    }

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      this.playerToLobbyId.delete(playerId);
      return {};
    }

    const leavingPlayer = lobby.players.find((p) => p.id === playerId);
    this.clearReconnectTimer(lobby.id, playerId);

    if (leavingPlayer?.sessionId) {
      this.sessionManager.setLobbyBinding(leavingPlayer.sessionId, undefined, undefined);
      this.sessionManager.clearSocket(leavingPlayer.sessionId, socketId);
    }

    this.playerToLobbyId.delete(playerId);

    if ((lobby.status === 'in_progress' || lobby.status === 'paused') && lobby.gameState) {
      if (leavingPlayer) {
        leavingPlayer.connected = false;
        leavingPlayer.connectionState = 'offline';
        leavingPlayer.eliminated = true;
        leavingPlayer.reconnectDeadline = undefined;
      }
      const remainingActive = lobby.players.filter(
        (p) => !p.isTvScreen && !p.eliminated && p.connectionState !== 'offline'
      );
      const game = gameRegistry.get(lobby.gameId);
      if (game?.onPlayerLeave) {
        const nextGameState = game.onPlayerLeave(lobby.gameState, playerId, remainingActive);
        lobby.gameState = nextGameState;
        if (nextGameState.status === 'won' || nextGameState.status === 'draw') {
          lobby.status = 'finished';
          this.archiveCompletedGameIfNeeded(lobby);
        }
      }
    } else {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
    }

    const remainingJoinable = lobby.players.filter(
      (p) => !p.isBot && p.connectionState !== 'offline'
    );
    if (remainingJoinable.length === 0) {
      this.archiveCompletedGameIfNeeded(lobby);
      lobby.status = 'expired';
      this.clearHostTransferTimer(lobby.id);
      this.removeLobbyIndexes(lobby);
      this.persistSnapshot();
      return {
        lobbyId: lobby.id,
        lobby,
        deleted: true,
        wasHost: lobby.hostId === playerId,
        leftLobby: lobby,
        lobbyDeleted: true,
        leavingPlayerId: playerId,
      };
    }

    let newHost: Player | undefined;
    let previousHostId: string | undefined;

    if (lobby.hostId === playerId) {
      this.clearHostTransferTimer(lobby.id);
      previousHostId = playerId;
      newHost = this.selectNextHost(lobby);
      if (newHost) {
        for (const p of lobby.players) {
          p.isHost = p.id === newHost.id;
        }
        lobby.hostId = newHost.id;
        lobby.hostDisconnectDeadline = undefined;
      }
    }

    this.maybeResumePausedLobby(lobby);
    lobby.stateVersion += 1;
    lobby.lastActivityAt = Date.now();
    this.persistSnapshot();

    return {
      lobbyId: lobby.id,
      lobby,
      deleted: false,
      wasHost: Boolean(previousHostId),
      leftLobby: lobby,
      lobbyDeleted: false,
      leavingPlayerId: playerId,
      newHost,
      previousHostId,
    };
  }

  public handleDisconnect(socketId: string): {
    lobbyId?: string;
    lobby?: Lobby;
    player?: Player;
    ignoredStaleSocket?: boolean;
  } {
    if (this.supersededSocketIds.delete(socketId)) {
      this.socketToPlayer.delete(socketId);
      return { ignoredStaleSocket: true };
    }

    const info = this.socketToPlayer.get(socketId);
    if (!info) return {};

    this.socketToPlayer.delete(socketId);

    const lobby = this.lobbies.get(info.lobbyId);
    if (!lobby) return {};

    const player = lobby.players.find((p) => p.id === info.playerId);
    if (!player) return {};

    // Wichtig: Veraltetes Disconnect-Event ignorieren, wenn sich der Spieler bereits mit neuem Socket verbunden hat
    if (player.socketId && player.socketId !== socketId) {
      return { ignoredStaleSocket: true };
    }

    if (player.sessionId) {
      this.sessionManager.clearSocket(player.sessionId, socketId);
    }

    const now = Date.now();
    player.connected = false;
    player.connectionState = 'disconnected';
    player.disconnectedAt = now;
    player.reconnectDeadline = now + this.reconnectGraceMs;

    // Host nicht sofort löschen, sondern nach Host-Ausfall-Frist geordnet übergeben
    if (player.isHost) {
      lobby.hostDisconnectDeadline = now + this.hostTransferGraceMs;
      this.scheduleHostTransferTimer(lobby.id);
    }

    // Laufendes Spiel pausieren, wenn temporär zu wenige verbundene Spieler übrig sind
    if (lobby.status === 'in_progress') {
      const connectedActivePlayers = lobby.players.filter(
        (p) => !p.isTvScreen && !p.eliminated && p.connected && p.connectionState === 'connected'
      );
      if (connectedActivePlayers.length < lobby.minPlayers) {
        lobby.status = 'paused';
        lobby.pausedAt = now;
        lobby.pausedReason = `Verbindung zu ${player.name} unterbrochen`;
      }
    }

    this.scheduleReconnectTimer(lobby.id, player.id, this.reconnectGraceMs);

    lobby.stateVersion += 1;
    lobby.lastActivityAt = now;
    this.persistSnapshot();

    return { lobbyId: lobby.id, lobby, player };
  }

  public expireDisconnectedPlayer(lobbyId: string, playerId: string): {
    expired: boolean;
    lobby?: Lobby;
    player?: Player;
  } {
    this.clearReconnectTimer(lobbyId, playerId);

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby || lobby.status === 'expired') {
      return { expired: false };
    }

    const player = lobby.players.find((p) => p.id === playerId);
    if (!player || player.connected || player.connectionState === 'connected') {
      return { expired: false };
    }

    if (player.connectionState === 'offline') {
      return { expired: false };
    }

    const now = Date.now();
    player.connected = false;
    player.connectionState = 'offline';
    player.reconnectDeadline = undefined;

    if (player.sessionId) {
      this.sessionManager.invalidateLobbyAccess(player.sessionId);
    }

    this.playerToLobbyId.delete(player.id);

    if (lobby.status === 'in_progress' || lobby.status === 'paused') {
      player.eliminated = true;
      const remainingActive = lobby.players.filter(
        (p) => !p.isTvScreen && !p.eliminated && p.connectionState !== 'offline'
      );
      const game = gameRegistry.get(lobby.gameId);
      if (lobby.gameState && game?.onPlayerLeave) {
        const nextGameState = game.onPlayerLeave(lobby.gameState, player.id, remainingActive);
        lobby.gameState = nextGameState;
        if (nextGameState.status === 'won' || nextGameState.status === 'draw') {
          lobby.status = 'finished';
          this.archiveCompletedGameIfNeeded(lobby);
        }
      }

      if (lobby.status === 'paused') {
        const connectedNow = lobby.players.filter(
          (p) => !p.isTvScreen && !p.eliminated && p.connected && p.connectionState === 'connected'
        );
        if (connectedNow.length >= lobby.minPlayers) {
          lobby.status = 'in_progress';
          lobby.pausedAt = undefined;
          lobby.pausedReason = undefined;
        }
      }
    } else if (lobby.status === 'waiting') {
      lobby.players = lobby.players.filter((p) => p.id !== player.id);
    }

    // Falls kein aktiver/verbundener Spieler mehr da ist, als inaktiv markieren (für Bereinigung)
    const remainingNonOffline = lobby.players.filter((p) => p.connectionState !== 'offline');
    if (remainingNonOffline.length === 0) {
      this.archiveCompletedGameIfNeeded(lobby);
      this.clearHostTransferTimer(lobby.id);
      if (lobby.status === 'waiting') {
        lobby.status = 'expired';
        this.removeLobbyIndexes(lobby);
        this.persistSnapshot();
        this.callbacks.onPlayerExpired?.(sanitizeLobbyForClient(lobby), { ...player, sessionId: undefined });
        this.callbacks.onLobbyExpired?.(sanitizeLobbyForClient(lobby));
        return { expired: true, lobby, player };
      }
    } else if (lobby.hostId === player.id) {
      // Falls Host abgelaufen ist und Host-Wechsel noch nicht stattfand -> sofort übertragen
      this.transferHostIfNeeded(lobby.id);
    }

    lobby.stateVersion += 1;
    lobby.lastActivityAt = now;
    this.persistSnapshot();

    const safeLobby = sanitizeLobbyForClient(lobby);
    const { sessionId: _omit, ...safePlayer } = player;
    this.callbacks.onPlayerExpired?.(safeLobby, safePlayer);
    this.callbacks.onLobbyUpdated?.(safeLobby);

    return { expired: true, lobby, player };
  }

  public transferHostIfNeeded(lobbyId: string): {
    transferred: boolean;
    lobby?: Lobby;
    newHost?: Player;
    previousHostId?: string;
  } {
    this.clearHostTransferTimer(lobbyId);
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby || lobby.status === 'expired') {
      return { transferred: false };
    }

    const currentHost = lobby.players.find((p) => p.id === lobby.hostId);
    if (currentHost && currentHost.connected && currentHost.connectionState === 'connected') {
      lobby.hostDisconnectDeadline = undefined;
      return { transferred: false };
    }

    const candidate = this.selectNextHost(lobby, true);
    if (!candidate) {
      return { transferred: false };
    }

    const previousHostId = lobby.hostId;
    for (const p of lobby.players) {
      p.isHost = p.id === candidate.id;
    }
    lobby.hostId = candidate.id;
    lobby.hostDisconnectDeadline = undefined;
    lobby.stateVersion += 1;
    lobby.lastActivityAt = Date.now();
    this.persistSnapshot();

    const safeLobby = sanitizeLobbyForClient(lobby);
    const { sessionId: _omit, ...safeHost } = candidate;
    this.callbacks.onHostChanged?.(safeLobby, safeHost, previousHostId, 'host_disconnected');
    this.callbacks.onLobbyUpdated?.(safeLobby);

    return { transferred: true, lobby, newHost: candidate, previousHostId };
  }

  public reconnectPlayer(params: {
    socketId: string;
    userId?: string;
    sessionId?: string;
    reconnectToken?: string;
    lobbyIdOrCode?: string;
  }): {
    success: boolean;
    lobby?: Lobby;
    player?: Player;
    reconnectToken?: string;
    supersededSocketId?: string;
    error?: string;
  } {
    this.cleanupExpiredLobbies();

    let effectivePlayerId = params.userId;
    let rotatedReconnectToken: string | undefined;

    if (params.sessionId) {
      const session = this.sessionManager.getSessionById(params.sessionId);
      if (!session) {
        return { success: false, error: 'Sitzung ist abgelaufen oder ungültig.' };
      }

      if (params.userId && params.userId !== session.playerId) {
        return { success: false, error: 'Benutzer-ID passt nicht zur aktuellen Sitzung.' };
      }

      effectivePlayerId = session.playerId;

      if (params.reconnectToken !== undefined) {
        const tokenCheck = this.sessionManager.verifyAndRotateReconnectToken(
          params.sessionId,
          params.reconnectToken
        );
        if (!tokenCheck.valid) {
          return {
            success: false,
            error: tokenCheck.error || 'Reconnect-Token ungültig oder abgelaufen.',
          };
        }
        rotatedReconnectToken = tokenCheck.nextReconnectToken;
      }
    }

    if (!effectivePlayerId) {
      return { success: false, error: 'Keine gültige Spieler-ID für Reconnect.' };
    }

    let lobbyId = this.playerToLobbyId.get(effectivePlayerId);
    if (!lobbyId && params.sessionId) {
      const sess = this.sessionManager.getSessionById(params.sessionId);
      lobbyId = sess?.lobbyId;
    }

    if (params.lobbyIdOrCode && lobbyId) {
      const requested = this.lobbies.get(params.lobbyIdOrCode) ?? this.findLobbyByCode(params.lobbyIdOrCode);
      if (!requested || requested.id !== lobbyId) {
        return {
          success: false,
          error: 'Kein Zugriff auf diese Lobby (Sitzung gehört zu einer anderen Lobby).',
        };
      }
    } else if (params.lobbyIdOrCode && !lobbyId) {
      return { success: false, error: 'Keine aktive Mitgliedschaft in dieser Lobby gefunden.' };
    }

    if (!lobbyId) {
      return { success: false, error: 'Keine aktive Lobby zum Wiederverbinden gefunden.' };
    }

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby || lobby.status === 'expired') {
      return { success: false, error: 'Die Lobby existiert nicht mehr oder ist abgelaufen.' };
    }

    const player = lobby.players.find((p) => p.id === effectivePlayerId);
    if (!player) {
      return { success: false, error: 'Spieler ist kein Mitglied dieser Lobby.' };
    }

    if (player.connectionState === 'offline' || player.eliminated) {
      return { success: false, error: 'Reconnect-Frist abgelaufen. Sitzung in dieser Lobby beendet.' };
    }

    if (player.sessionId && params.sessionId && player.sessionId !== params.sessionId) {
      return {
        success: false,
        error: 'Sicherheitsverletzung: Sitzung stimmt nicht mit dem Spieler überein.',
      };
    }

    // Alte Socket-Verbindung der gleichen Session sauber ablösen (verhindert Doppelsteuerung)
    const supersededSocketId =
      player.socketId && player.socketId !== params.socketId ? player.socketId : undefined;
    if (supersededSocketId) {
      this.socketToPlayer.delete(supersededSocketId);
      this.supersededSocketIds.add(supersededSocketId);
    }

    this.clearReconnectTimer(lobby.id, player.id);
    if (player.isHost) {
      this.clearHostTransferTimer(lobby.id);
      lobby.hostDisconnectDeadline = undefined;
    }

    player.socketId = params.socketId;
    player.connected = true;
    player.connectionState = 'connected';
    player.disconnectedAt = undefined;
    player.reconnectDeadline = undefined;
    if (params.sessionId) {
      player.sessionId = params.sessionId;
    }

    this.maybeResumePausedLobby(lobby);

    lobby.stateVersion += 1;
    lobby.lastActivityAt = Date.now();
    lobby.expiresAt = Date.now() + this.lobbyExpireMs;

    this.playerToLobbyId.set(player.id, lobby.id);
    this.socketToPlayer.set(params.socketId, { lobbyId: lobby.id, playerId: player.id });

    if (params.sessionId) {
      this.sessionManager.setLobbyBinding(params.sessionId, lobby.id, lobby.code);
      this.sessionManager.bindSocket(params.sessionId, params.socketId);
      if (!rotatedReconnectToken) {
        rotatedReconnectToken = this.sessionManager.rotateReconnectToken(params.sessionId) ?? undefined;
      }
    }

    this.persistSnapshot();

    return {
      success: true,
      lobby,
      player,
      reconnectToken: rotatedReconnectToken,
      supersededSocketId,
    };
  }

  public clearAllTimers(): void {
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    for (const timer of this.hostTransferTimers.values()) {
      clearTimeout(timer);
    }
    this.hostTransferTimers.clear();
  }

  public async shutdown(): Promise<void> {
    this.clearAllTimers();
    await this.stateStore.close();
  }

  private scheduleReconnectTimer(lobbyId: string, playerId: string, delayMs: number): void {
    const key = `${lobbyId}:${playerId}`;
    this.clearReconnectTimer(lobbyId, playerId);
    const timer = setTimeout(() => {
      this.reconnectTimers.delete(key);
      this.expireDisconnectedPlayer(lobbyId, playerId);
    }, Math.max(10, delayMs));
    timer.unref?.();
    this.reconnectTimers.set(key, timer);
  }

  private clearReconnectTimer(lobbyId: string, playerId: string): void {
    const key = `${lobbyId}:${playerId}`;
    const existing = this.reconnectTimers.get(key);
    if (existing) {
      clearTimeout(existing);
      this.reconnectTimers.delete(key);
    }
  }

  private scheduleHostTransferTimer(lobbyId: string): void {
    this.clearHostTransferTimer(lobbyId);
    const timer = setTimeout(() => {
      this.hostTransferTimers.delete(lobbyId);
      this.transferHostIfNeeded(lobbyId);
    }, Math.max(10, this.hostTransferGraceMs));
    timer.unref?.();
    this.hostTransferTimers.set(lobbyId, timer);
  }

  private clearHostTransferTimer(lobbyId: string): void {
    const existing = this.hostTransferTimers.get(lobbyId);
    if (existing) {
      clearTimeout(existing);
      this.hostTransferTimers.delete(lobbyId);
    }
  }

  private selectNextHost(lobby: Lobby, connectedOnly = false): Player | undefined {
    const connectedNonTv = lobby.players.find(
      (p) => !p.isBot && !p.isTvScreen && p.connected && p.connectionState === 'connected' && !p.eliminated
    );
    if (connectedNonTv) return connectedNonTv;

    const connectedAny = lobby.players.find(
      (p) => !p.isBot && p.connected && p.connectionState === 'connected' && !p.eliminated
    );
    if (connectedAny || connectedOnly) return connectedAny;

    return (
      lobby.players.find((p) => !p.isBot && !p.isTvScreen && p.connectionState !== 'offline') ??
      lobby.players.find((p) => !p.isBot && p.connectionState !== 'offline')
    );
  }

  private maybeResumePausedLobby(lobby: Lobby): void {
    if (lobby.status !== 'paused') return;
    const connectedActive = lobby.players.filter(
      (p) => !p.isTvScreen && !p.eliminated && p.connected && p.connectionState === 'connected'
    );
    if (connectedActive.length >= lobby.minPlayers) {
      lobby.status = 'in_progress';
      lobby.pausedAt = undefined;
      lobby.pausedReason = undefined;
    }
  }

  private isDuplicateAction(lobby: Lobby, actionId?: string): boolean {
    if (!actionId) return false;
    return Boolean(lobby.processedActionIds?.includes(actionId));
  }

  private recordActionId(lobby: Lobby, actionId?: string): void {
    if (!actionId) return;
    if (!lobby.processedActionIds) {
      lobby.processedActionIds = [];
    }
    if (!lobby.processedActionIds.includes(actionId)) {
      lobby.processedActionIds.push(actionId);
      if (lobby.processedActionIds.length > MAX_PROCESSED_ACTIONS) {
        lobby.processedActionIds.splice(0, lobby.processedActionIds.length - MAX_PROCESSED_ACTIONS);
      }
    }
  }

  private archiveCompletedGameIfNeeded(lobby: Lobby): void {
    const gs: BaseGameState | null = lobby.gameState;
    if (!gs || (gs.status !== 'won' && gs.status !== 'draw')) {
      return;
    }

    if (!lobby.finishedResults) {
      lobby.finishedResults = [];
    }

    // Verhindert mehrfaches Speichern desselben abgeschlossenen Spiels
    const alreadySaved = lobby.finishedResults.some(
      (r) => r.gameId === gs.gameId && r.startedAt === gs.startedAt
    );
    if (alreadySaved) return;

    const winner = gs.winnerId ? lobby.players.find((p) => p.id === gs.winnerId) : undefined;
    const scores: Record<string, number> | undefined =
      gs.scores && typeof gs.scores === 'object' ? { ...gs.scores } : undefined;

    const record: GameResultRecord = {
      gameId: gs.gameId,
      startedAt: gs.startedAt,
      finishedAt: Date.now(),
      status: gs.status,
      winnerId: gs.winnerId ?? null,
      winnerName: winner?.name ?? null,
      scores,
      players: lobby.players
        .filter((p) => !p.isTvScreen)
        .map((p) => ({
          id: p.id,
          name: p.name,
          score: scores?.[p.id],
          eliminated: Boolean(p.eliminated),
        })),
    };

    lobby.finishedResults.push(record);
    if (!lobby.isSimulated) {
      this.stateStore.recordCompletedResult(record, {
        lobbyId: lobby.id,
        lobbyCode: lobby.code,
        isTvMode: Boolean(lobby.isTvMode),
      });
    }
  }

  private removeLobbyIndexes(lobby: Lobby): void {
    this.callbacks.onLobbyRemoved?.(lobby.id);
    this.clearHostTransferTimer(lobby.id);
    for (const p of lobby.players) {
      this.clearReconnectTimer(lobby.id, p.id);
      if (this.playerToLobbyId.get(p.id) === lobby.id) {
        this.playerToLobbyId.delete(p.id);
      }
      if (p.socketId) {
        const mapping = this.socketToPlayer.get(p.socketId);
        if (mapping?.lobbyId === lobby.id) {
          this.socketToPlayer.delete(p.socketId);
        }
      }
    }
    this.codeToLobbyId.delete(lobby.code.toUpperCase());
    this.lobbies.delete(lobby.id);
  }

  private persistSnapshot(): void {
    void this.stateStore.queueSave(
      Array.from(this.lobbies.values()),
      this.sessionManager.exportSessions()
    );
  }
}

export const lobbyManager = new LobbyManager({
  stateStore: createDefaultPersistenceStore({
    filePath: getDefaultStateFilePath(),
    redisUrl: process.env.REDIS_URL,
  }),
});
