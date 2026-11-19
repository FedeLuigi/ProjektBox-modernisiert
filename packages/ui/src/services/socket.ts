import { io, Socket } from 'socket.io-client';
import { normalizeBackendBaseUrl } from '@projektbox/shared/utils';
import type { ClientRole, Lobby, LobbySummary } from '../types/multiplayer';
import {
  getUserProfile,
  saveUserProfile,
  STORAGE_KEYS,
  subscribeUserProfile,
} from '../utils/userProfile';

export type ConnectionStatus =
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'reconnected'
  | 'failed'
  | 'expired';

export interface ConnectionMeta {
  status: ConnectionStatus;
  attempt: number;
  reconnectDeadline?: number;
  lastPongAt?: number;
  latencyMs?: number;
  errorMessage?: string;
}

export interface SessionInfoResponse {
  authenticated: boolean;
  sessionId?: string;
  playerId?: string;
  expiresAt?: number;
  activeLobby?: Lobby | null;
}

const DEFAULT_RECONNECT_GRACE_MS = 60_000;
const HEARTBEAT_INTERVAL_MS = 15_000;
const HEARTBEAT_TIMEOUT_MS = 8_000;
const RECONNECTED_BANNER_MS = 3_000;

const SESSION_TOKEN_STORAGE_KEY = 'projektbox_session_token';

function normalizeBaseUrl(raw?: string | null): string {
  return normalizeBackendBaseUrl(raw);
}

function generateActionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `act_${crypto.randomUUID()}`;
  }
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

class SocketService {
  private socket: Socket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private meta: ConnectionMeta = { status: 'disconnected', attempt: 0 };

  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private metaListeners = new Set<(meta: ConnectionMeta) => void>();

  private activeLobbyId: string | null = null;
  private latestStateVersion = 0;
  private intentionalDisconnect = false;
  private wasConnectedOnce = false;

  // Ephemeres Reconnect-Token ausschließlich im Arbeitsspeicher (niemals im localStorage)
  private reconnectToken: string | undefined = undefined;
  private crossOriginSessionToken: string | null = null;
  private clientRole: ClientRole =
    typeof window !== 'undefined' &&
    (import.meta.env.VITE_APP_ROLE === 'tv' || window.location.port === '5174')
      ? 'tv'
      : 'smartphone';
  private sessionEnsured = false;
  private ensureSessionPromise: Promise<SessionInfoResponse | null> | null = null;
  private reconnectInFlight: Promise<Lobby | null> | null = null;

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectedResetTimer: ReturnType<typeof setTimeout> | null = null;

  private customListeners = new Map<string, Set<(...args: any[]) => void>>();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleNetworkOnline);
      window.addEventListener('offline', this.handleNetworkOffline);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getConnectionMeta(): ConnectionMeta {
    return { ...this.meta };
  }

  public isActionBlocked(): boolean {
    if (!this.socket || !this.socket.connected) return true;
    return (
      this.status === 'reconnecting' ||
      this.status === 'disconnected' ||
      this.status === 'failed' ||
      this.status === 'expired'
    );
  }

  public onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public onConnectionMetaChange(listener: (meta: ConnectionMeta) => void): () => void {
    this.metaListeners.add(listener);
    listener({ ...this.meta });
    return () => {
      this.metaListeners.delete(listener);
    };
  }

  private updateConnectionMeta(partial: Partial<ConnectionMeta> & { status?: ConnectionStatus }) {
    const nextStatus = partial.status ?? this.status;
    this.status = nextStatus;
    this.meta = {
      ...this.meta,
      ...partial,
      status: nextStatus,
    };

    for (const listener of this.statusListeners) {
      listener(this.status);
    }
    const snapshot = { ...this.meta };
    for (const listener of this.metaListeners) {
      listener(snapshot);
    }
  }

  public setClientRole(role: ClientRole): void {
    if (this.clientRole !== role) {
      this.clientRole = role;
      this.crossOriginSessionToken = null;
      this.sessionEnsured = false;
    }
  }

  private getTokenStorageKey(): string {
    return `${SESSION_TOKEN_STORAGE_KEY}_${this.clientRole}`;
  }

  private getCrossOriginSessionToken(): string | null {
    if (this.crossOriginSessionToken) return this.crossOriginSessionToken;
    if (typeof window !== 'undefined') {
      try {
        const stored = window.sessionStorage.getItem(this.getTokenStorageKey());
        if (stored) {
          this.crossOriginSessionToken = stored;
          return stored;
        }
      } catch {
        // ignore sessionStorage failure
      }
    }
    return null;
  }

  private setCrossOriginSessionToken(token: string | null): void {
    this.crossOriginSessionToken = token;
    if (typeof window !== 'undefined') {
      try {
        if (token) {
          window.sessionStorage.setItem(this.getTokenStorageKey(), token);
        } else {
          window.sessionStorage.removeItem(this.getTokenStorageKey());
        }
      } catch {
        // ignore sessionStorage failure
      }
    }
  }

  public getSocketUrl(): string {
    if (typeof window !== 'undefined') {
      const custom = localStorage.getItem(STORAGE_KEYS.SOCKET_URL);
      if (custom && custom.trim()) {
        return normalizeBaseUrl(custom);
      }
    }
    const socketEnv = normalizeBaseUrl(import.meta.env.VITE_SOCKET_URL);
    if (socketEnv) return socketEnv;
    const apiEnv = normalizeBaseUrl(import.meta.env.VITE_API_URL);
    if (apiEnv) return apiEnv;
    return '';
  }

  public setSocketUrl(url: string | null) {
    if (typeof window !== 'undefined') {
      if (!url || !url.trim()) {
        localStorage.removeItem(STORAGE_KEYS.SOCKET_URL);
      } else {
        localStorage.setItem(STORAGE_KEYS.SOCKET_URL, url.trim());
      }
      this.sessionEnsured = false;
      this.setCrossOriginSessionToken(null);
      this.disconnect();
      void this.ensureConnectedWithSession().catch(() => {});
    }
  }

  public getApiBaseUrl(): string {
    if (typeof window !== 'undefined') {
      const custom = localStorage.getItem(STORAGE_KEYS.SOCKET_URL);
      if (custom && custom.trim()) {
        return normalizeBaseUrl(custom);
      }
    }
    const apiEnv = normalizeBaseUrl(import.meta.env.VITE_API_URL);
    if (apiEnv) return apiEnv;
    return this.getSocketUrl();
  }

  private isCrossOriginTarget(baseUrl: string): boolean {
    if (typeof window === 'undefined' || !baseUrl) return false;
    try {
      return new URL(baseUrl, window.location.origin).origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  /**
   * Authentifiziert den Browser über Cookie (/api/session) sowie bei getrennten Domains
   * ergänzend über den Cross-Origin Session-Token Header (X-Session-Token -> Bearer / Socket auth).
   */
  public async ensureSession(forceRefresh = false): Promise<SessionInfoResponse | null> {
    if (this.sessionEnsured && !forceRefresh && !this.ensureSessionPromise) {
      return { authenticated: true, playerId: getUserProfile().id };
    }
    if (this.ensureSessionPromise && !forceRefresh) {
      return this.ensureSessionPromise;
    }

    const profile = getUserProfile();
    const apiBase = this.getApiBaseUrl();
    const apiUrl = `${apiBase}/api/session`;
    const isCrossOrigin = this.isCrossOriginTarget(apiBase);

    this.ensureSessionPromise = (async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Client-Role': this.clientRole,
        };
        if (isCrossOrigin) {
          headers['X-Client-Transport'] = 'cross-origin';
        }
        const existingToken = this.getCrossOriginSessionToken();
        if (existingToken) {
          headers.Authorization = `Bearer ${existingToken}`;
        }

        const res = await fetch(apiUrl, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({ playerId: profile.id, clientRole: this.clientRole }),
        });
        if (!res.ok) {
          if (res.status === 401) {
            this.setCrossOriginSessionToken(null);
          }
          return null;
        }
        const headerToken = res.headers.get('X-Session-Token');
        if (headerToken) {
          this.setCrossOriginSessionToken(headerToken);
        }
        const data = (await res.json()) as SessionInfoResponse;
        this.sessionEnsured = true;

        if (data.playerId && data.playerId !== profile.id) {
          saveUserProfile({ id: data.playerId });
        }
        if (data.activeLobby) {
          this.syncLobbyTracking(data.activeLobby);
        }
        return data;
      } catch {
        return null;
      } finally {
        this.ensureSessionPromise = null;
      }
    })();

    return this.ensureSessionPromise;
  }

  /**
   * Stellt nach Browser-Reload oder Tab-Neustart automatisch eine noch laufende Lobby/Sitzung wieder her.
   */
  public async restoreSession(): Promise<Lobby | null> {
    const info = await this.ensureSession(true);
    if (!info?.activeLobby) {
      return null;
    }
    if (info.activeLobby.status === 'expired') {
      return null;
    }

    try {
      await this.ensureConnectedWithSession();
      const restored = await this.reconnectActiveLobby(info.activeLobby.id);
      return restored ?? info.activeLobby;
    } catch {
      return null;
    }
  }

  public manualReconnect(): void {
    this.intentionalDisconnect = false;
    this.updateConnectionMeta({
      status: 'reconnecting',
      attempt: 1,
      errorMessage: undefined,
    });
    if (this.socket) {
      this.socket.connect();
    } else {
      void this.ensureConnectedWithSession().catch(() => {});
    }
  }

  private handleNetworkOffline = () => {
    if (!this.socket && !this.activeLobbyId) return;
    this.stopHeartbeat();
    this.updateConnectionMeta({
      status: 'disconnected',
      reconnectDeadline:
        this.meta.reconnectDeadline ?? Date.now() + DEFAULT_RECONNECT_GRACE_MS,
      errorMessage: 'Keine Internetverbindung.',
    });
  };

  private handleNetworkOnline = () => {
    if (this.intentionalDisconnect) return;
    if (!this.socket && !this.activeLobbyId) return;
    this.updateConnectionMeta({
      status: 'reconnecting',
      attempt: 1,
      errorMessage: undefined,
    });
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    } else if (this.activeLobbyId) {
      void this.reconnectActiveLobby(this.activeLobbyId);
    }
  };

  private handleVisibilityChange = () => {
    if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
    if (this.intentionalDisconnect || !this.socket) return;

    if (!this.socket.connected) {
      this.updateConnectionMeta({ status: 'reconnecting', attempt: this.meta.attempt + 1 });
      this.socket.connect();
    } else {
      this.sendHeartbeatPing();
    }
  };

  public connect(): Socket {
    if (this.socket) {
      if (!this.socket.connected && !this.intentionalDisconnect) {
        this.updateConnectionMeta({ status: 'reconnecting', attempt: 1 });
        this.socket.connect();
      }
      return this.socket;
    }

    this.intentionalDisconnect = false;
    this.updateConnectionMeta({
      status: 'reconnecting',
      attempt: 1,
      errorMessage: undefined,
    });

    const targetUrl = this.getSocketUrl();
    const sock = io(targetUrl || window.location.origin, {
      withCredentials: true,
      auth: (cb) => {
        const token = this.getCrossOriginSessionToken();
        cb(
          token
            ? { sessionToken: token, clientRole: this.clientRole }
            : { clientRole: this.clientRole }
        );
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 1000, // Exponentieller Backoff-Start (1s -> 2s -> 4s -> ...)
      reconnectionDelayMax: 15000, // Begrenzte maximale Wartezeit (15s)
      randomizationFactor: 0.5, // Jitter gegen Thundering Herd
      timeout: 20000,
    });

    this.socket = sock;

    // Registriere gespeicherte App-Event-Listener auf neuer Socket-Instanz
    for (const [event, handlers] of this.customListeners.entries()) {
      for (const handler of handlers) {
        sock.on(event, handler);
      }
    }

    sock.on('connect', () => {
      this.startHeartbeat();
      const wasReconnect = this.wasConnectedOnce || Boolean(this.activeLobbyId);
      this.wasConnectedOnce = true;

      if (this.reconnectedResetTimer) {
        clearTimeout(this.reconnectedResetTimer);
        this.reconnectedResetTimer = null;
      }

      if (wasReconnect) {
        this.updateConnectionMeta({
          status: 'reconnected',
          attempt: 0,
          reconnectDeadline: undefined,
          errorMessage: undefined,
        });
        this.reconnectedResetTimer = setTimeout(() => {
          this.reconnectedResetTimer = null;
          if (this.status === 'reconnected' && this.socket?.connected) {
            this.updateConnectionMeta({ status: 'connected', attempt: 0 });
          }
        }, RECONNECTED_BANNER_MS);

        if (this.activeLobbyId) {
          void this.reconnectActiveLobby(this.activeLobbyId);
        }
      } else {
        this.updateConnectionMeta({
          status: 'connected',
          attempt: 0,
          reconnectDeadline: undefined,
          errorMessage: undefined,
        });
      }
    });

    sock.on('disconnect', (reason) => {
      this.stopHeartbeat();
      if (this.intentionalDisconnect || reason === 'io client disconnect') {
        this.updateConnectionMeta({
          status: 'disconnected',
          attempt: 0,
          reconnectDeadline: undefined,
        });
        return;
      }

      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      this.updateConnectionMeta({
        status: offline ? 'disconnected' : 'reconnecting',
        attempt: 1,
        reconnectDeadline:
          this.meta.reconnectDeadline ?? Date.now() + DEFAULT_RECONNECT_GRACE_MS,
      });
    });

    sock.on('connect_error', (err) => {
      if (this.status === 'expired') return;
      this.updateConnectionMeta({
        status: 'reconnecting',
        attempt: this.meta.attempt + 1,
        errorMessage: err.message || 'Verbindung unterbrochen',
      });
    });

    sock.io.on('reconnect_attempt', (attempt) => {
      if (this.status === 'expired') return;
      this.updateConnectionMeta({
        status: 'reconnecting',
        attempt,
        reconnectDeadline:
          this.meta.reconnectDeadline ?? Date.now() + DEFAULT_RECONNECT_GRACE_MS,
      });
    });

    sock.io.on('reconnect_failed', () => {
      this.updateConnectionMeta({
        status: 'failed',
        errorMessage: 'Automatische Wiederverbindung fehlgeschlagen.',
      });
    });

    // Live State-Synchronisation vom Server aktualisieren
    sock.on('lobby:updated', ({ lobby }: { lobby?: Lobby }) => {
      if (lobby) this.syncLobbyTracking(lobby);
    });
    sock.on('game:started', ({ lobby }: { lobby?: Lobby }) => {
      if (lobby) this.syncLobbyTracking(lobby);
    });
    sock.on('game:state', ({ lobby }: { lobby?: Lobby }) => {
      if (lobby) this.syncLobbyTracking(lobby);
    });
    sock.on('game:restarted', ({ lobby }: { lobby?: Lobby }) => {
      if (lobby) this.syncLobbyTracking(lobby);
    });
    sock.on(
      'lobby:state-sync',
      ({ lobby, reconnectToken }: { lobby?: Lobby; reconnectToken?: string }) => {
        if (lobby) this.syncLobbyTracking(lobby);
        if (reconnectToken) this.reconnectToken = reconnectToken;
      }
    );

    sock.on('session:expired', (payload?: { message?: string }) => {
      this.activeLobbyId = null;
      this.reconnectToken = undefined;
      this.stopHeartbeat();
      this.updateConnectionMeta({
        status: 'expired',
        reconnectDeadline: undefined,
        errorMessage: payload?.message || 'Sitzung abgelaufen.',
      });
    });

    sock.on('session:conflict', (payload?: { message?: string }) => {
      this.activeLobbyId = null;
      this.reconnectToken = undefined;
      this.intentionalDisconnect = true;
      this.stopHeartbeat();
      this.updateConnectionMeta({
        status: 'expired',
        reconnectDeadline: undefined,
        errorMessage:
          payload?.message || 'Diese Sitzung wurde in einem neuen Fenster geöffnet.',
      });
    });

    sock.on('lobby:expired', () => {
      this.activeLobbyId = null;
      this.reconnectToken = undefined;
    });

    return sock;
  }

  private async ensureConnectedWithSession(): Promise<Socket> {
    await this.ensureSession();
    const sock = this.connect();
    if (sock.connected) {
      return sock;
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        sock.off('connect', onConnect);
        reject(new Error('Zeitüberschreitung: Server nicht erreichbar.'));
      }, 15_000);

      const onConnect = () => {
        clearTimeout(timer);
        resolve(sock);
      };
      sock.once('connect', onConnect);
    });
  }

  private syncLobbyTracking(lobby: Lobby) {
    if (lobby.status === 'expired') {
      if (this.activeLobbyId === lobby.id) {
        this.activeLobbyId = null;
      }
      return;
    }
    this.activeLobbyId = lobby.id;
    if (typeof lobby.stateVersion === 'number') {
      this.latestStateVersion = lobby.stateVersion;
    }

    const me = lobby.players.find((p) => p.id === getUserProfile().id);
    if (me?.connectionState === 'disconnected' && me.reconnectDeadline) {
      this.updateConnectionMeta({ reconnectDeadline: me.reconnectDeadline });
    }
  }

  private async reconnectActiveLobby(lobbyIdOrCode?: string): Promise<Lobby | null> {
    if (this.reconnectInFlight) {
      return this.reconnectInFlight;
    }
    const targetLobby = lobbyIdOrCode ?? this.activeLobbyId;
    if (!targetLobby || !this.socket?.connected) {
      return null;
    }

    const userId = getUserProfile().id;
    this.reconnectInFlight = new Promise<Lobby | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 8_000);
      this.socket!.emit(
        'lobby:reconnect',
        {
          userId,
          lobbyIdOrCode: targetLobby,
          reconnectToken: this.reconnectToken,
        },
        (res: {
          success: boolean;
          lobby?: Lobby;
          reconnectToken?: string;
          error?: string;
        }) => {
          clearTimeout(timer);
          if (res?.success && res.lobby) {
            this.syncLobbyTracking(res.lobby);
            if (res.reconnectToken) {
              this.reconnectToken = res.reconnectToken;
            }
            resolve(res.lobby);
          } else {
            if (res?.error?.toLowerCase().includes('abgelaufen')) {
              this.activeLobbyId = null;
              this.reconnectToken = undefined;
              this.updateConnectionMeta({
                status: 'expired',
                errorMessage: res.error,
              });
            }
            resolve(null);
          }
        }
      );
    }).finally(() => {
      this.reconnectInFlight = null;
    });

    return this.reconnectInFlight;
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.sendHeartbeatPing();
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeatPing();
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private sendHeartbeatPing() {
    if (!this.socket || !this.socket.connected) return;
    const sentAt = Date.now();

    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
    }

    this.heartbeatTimeoutTimer = setTimeout(() => {
      if (this.socket?.connected && this.status === 'connected') {
        this.updateConnectionMeta({
          status: 'reconnecting',
          attempt: 1,
          reconnectDeadline:
            this.meta.reconnectDeadline ?? Date.now() + DEFAULT_RECONNECT_GRACE_MS,
          errorMessage: 'Verbindung reagiert nicht (Timeout).',
        });
      }
    }, HEARTBEAT_TIMEOUT_MS);

    this.socket.emit(
      'session:ping',
      { clientTime: sentAt },
      (res?: { serverTime: number; sessionValid: boolean }) => {
        if (this.heartbeatTimeoutTimer) {
          clearTimeout(this.heartbeatTimeoutTimer);
          this.heartbeatTimeoutTimer = null;
        }
        if (!res) return;
        if (!res.sessionValid) {
          this.updateConnectionMeta({
            status: 'expired',
            errorMessage: 'Sitzung auf dem Server abgelaufen.',
          });
          return;
        }
        const latencyMs = Math.max(0, Date.now() - sentAt);
        this.updateConnectionMeta({
          lastPongAt: Date.now(),
          latencyMs,
        });
      }
    );
  }

  public disconnect() {
    this.intentionalDisconnect = true;
    this.stopHeartbeat();
    if (this.reconnectedResetTimer) {
      clearTimeout(this.reconnectedResetTimer);
      this.reconnectedResetTimer = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.activeLobbyId = null;
    this.reconnectToken = undefined;
    this.wasConnectedOnce = false;
    this.updateConnectionMeta({
      status: 'disconnected',
      attempt: 0,
      reconnectDeadline: undefined,
    });
  }

  public setActiveLobbyId(id: string | null) {
    this.activeLobbyId = id;
    if (!id) {
      this.reconnectToken = undefined;
    }
  }

  public updatePlayerProfile(userProfile = getUserProfile()): void {
    const apiBase = this.getApiBaseUrl();
    const token = this.getCrossOriginSessionToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Role': this.clientRole,
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    void fetch(`${apiBase}/api/players/me`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify({
        id: userProfile.id,
        name: userProfile.name,
        avatar: userProfile.avatar,
      }),
    }).catch(() => {});

    if (!this.socket || !this.socket.connected || !this.activeLobbyId) return;
    this.socket.emit('lobby:update-profile', { userProfile });
  }

  public async getPublicLobbies(gameId?: string): Promise<LobbySummary[]> {
    const sock = await this.ensureConnectedWithSession();
    return new Promise((resolve, reject) => {
      sock.emit(
        'lobby:list',
        { gameId },
        (res: { success: boolean; lobbies?: LobbySummary[]; error?: string }) => {
          if (res?.success && res.lobbies) {
            resolve(res.lobbies);
          } else {
            reject(new Error(res?.error || 'Lobbys konnten nicht geladen werden.'));
          }
        }
      );
    });
  }

  public async createLobby(
    name: string,
    isPrivate: boolean,
    gameId: string,
    isTvMode = false
  ): Promise<Lobby> {
    const sock = await this.ensureConnectedWithSession();
    const userProfile = getUserProfile();
    return new Promise((resolve, reject) => {
      sock.emit(
        'lobby:create',
        { name, isPrivate, gameId, userProfile, isTvMode },
        (res: {
          success: boolean;
          lobby?: Lobby;
          reconnectToken?: string;
          error?: string;
        }) => {
          if (res?.success && res.lobby) {
            this.syncLobbyTracking(res.lobby);
            if (res.reconnectToken) {
              this.reconnectToken = res.reconnectToken;
            }
            resolve(res.lobby);
          } else {
            reject(new Error(res?.error || 'Lobby konnte nicht erstellt werden.'));
          }
        }
      );
    });
  }

  public async simulateGame(
    gameId: string,
    isTvMode = false,
    botCount = 2,
    settings?: Record<string, any>
  ): Promise<Lobby> {
    const sock = await this.ensureConnectedWithSession();
    const userProfile = getUserProfile();
    return new Promise((resolve, reject) => {
      sock.emit(
        'lobby:simulate',
        { gameId, userProfile, isTvMode, botCount, settings },
        (res: {
          success: boolean;
          lobby?: Lobby;
          reconnectToken?: string;
          error?: string;
        }) => {
          if (res?.success && res.lobby) {
            this.syncLobbyTracking(res.lobby);
            if (res.reconnectToken) {
              this.reconnectToken = res.reconnectToken;
            }
            resolve(res.lobby);
          } else {
            reject(new Error(res?.error || 'Simulation konnte nicht gestartet werden.'));
          }
        }
      );
    });
  }

  public async getLobbyByCode(code: string): Promise<Lobby> {
    const sock = await this.ensureConnectedWithSession();
    return new Promise((resolve, reject) => {
      sock.emit(
        'lobby:getByCode',
        { code },
        (res: { success: boolean; lobby?: Lobby; error?: string }) => {
          if (res?.success && res.lobby) {
            resolve(res.lobby);
          } else {
            reject(new Error(res?.error || 'Lobby nicht gefunden.'));
          }
        }
      );
    });
  }

  public async joinLobby(lobbyIdOrCode: string): Promise<Lobby> {
    const sock = await this.ensureConnectedWithSession();
    const userProfile = getUserProfile();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Zeitüberschreitung: Lobby konnte nicht erreicht werden.'));
      }, 10000);

      sock.emit(
        'lobby:join',
        { lobbyIdOrCode, userProfile },
        (res: {
          success: boolean;
          lobby?: Lobby;
          reconnectToken?: string;
          error?: string;
        }) => {
          clearTimeout(timer);
          if (res?.success && res.lobby) {
            this.syncLobbyTracking(res.lobby);
            if (res.reconnectToken) {
              this.reconnectToken = res.reconnectToken;
            }
            resolve(res.lobby);
          } else {
            reject(new Error(res?.error || 'Lobby konnte nicht beigetreten werden.'));
          }
        }
      );
    });
  }

  public async updateLobbySettings(settings: Record<string, any>): Promise<Lobby> {
    if (this.isActionBlocked()) {
      throw new Error('Verbindung unsicher – bitte warte auf die Wiederverbindung.');
    }
    const sock = this.connect();
    const actionId = generateActionId();
    return new Promise((resolve, reject) => {
      sock.emit(
        'lobby:update-settings',
        { settings, actionId, expectedVersion: this.latestStateVersion },
        (res: { success: boolean; lobby?: Lobby; error?: string }) => {
          if (res?.success && res.lobby) {
            this.syncLobbyTracking(res.lobby);
            resolve(res.lobby);
          } else {
            reject(new Error(res?.error || 'Einstellungen konnten nicht aktualisiert werden.'));
          }
        }
      );
    });
  }

  public async switchLobbyMode(isTvMode: boolean): Promise<Lobby> {
    if (this.isActionBlocked()) {
      throw new Error('Verbindung unsicher – bitte warte auf die Wiederverbindung.');
    }
    const sock = this.connect();
    const actionId = generateActionId();
    return new Promise((resolve, reject) => {
      sock.emit(
        'lobby:switch-mode',
        { isTvMode, actionId, expectedVersion: this.latestStateVersion },
        (res: { success: boolean; lobby?: Lobby; error?: string }) => {
          if (res?.success && res.lobby) {
            this.syncLobbyTracking(res.lobby);
            resolve(res.lobby);
          } else {
            reject(new Error(res?.error || 'Lobby-Modus konnte nicht gewechselt werden.'));
          }
        }
      );
    });
  }

  public async toggleReady(): Promise<Lobby> {
    if (this.isActionBlocked()) {
      throw new Error('Verbindung unsicher – Aktion blockiert bis Verbindung steht.');
    }
    const sock = this.connect();
    const actionId = generateActionId();
    return new Promise((resolve, reject) => {
      sock.emit(
        'lobby:ready',
        { actionId, expectedVersion: this.latestStateVersion },
        (res: { success: boolean; lobby?: Lobby; error?: string }) => {
          if (res?.success && res.lobby) {
            this.syncLobbyTracking(res.lobby);
            resolve(res.lobby);
          } else {
            reject(new Error(res?.error || 'Bereit-Status konnte nicht geändert werden.'));
          }
        }
      );
    });
  }

  public async startLobby(): Promise<Lobby> {
    if (this.isActionBlocked()) {
      throw new Error('Verbindung unsicher – Spielstart pausiert bis zur Wiederverbindung.');
    }
    const sock = this.connect();
    const actionId = generateActionId();
    return new Promise((resolve, reject) => {
      sock.emit(
        'lobby:start',
        { actionId, expectedVersion: this.latestStateVersion },
        (res: { success: boolean; lobby?: Lobby; error?: string }) => {
          if (res?.success && res.lobby) {
            this.syncLobbyTracking(res.lobby);
            resolve(res.lobby);
          } else {
            reject(new Error(res?.error || 'Spiel konnte nicht gestartet werden.'));
          }
        }
      );
    });
  }

  public async sendMove(moveData: any): Promise<void> {
    if (this.isActionBlocked()) {
      throw new Error('Verbindung unterbrochen – Zug konnte nicht gesendet werden.');
    }
    const sock = this.connect();
    const actionId = moveData?.actionId || generateActionId();
    const payload = {
      ...moveData,
      actionId,
      expectedVersion:
        typeof moveData?.expectedVersion === 'number'
          ? moveData.expectedVersion
          : this.latestStateVersion,
    };

    return new Promise((resolve, reject) => {
      sock.emit(
        'game:move',
        payload,
        (res: { success: boolean; lobby?: Lobby; error?: string }) => {
          if (res?.lobby) {
            this.syncLobbyTracking(res.lobby);
          }
          if (res?.success) {
            resolve();
          } else {
            reject(new Error(res?.error || 'Ungültiger Zug.'));
          }
        }
      );
    });
  }

  public emitStrokes(strokes: any[]): void {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('draw:strokes', { strokes });
  }

  public emitClearCanvas(): void {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('draw:clear');
  }

  public emitUndo(): void {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('draw:undo');
  }

  public async requestRematch(): Promise<void> {
    if (this.isActionBlocked()) {
      throw new Error('Verbindung unsicher – bitte kurz warten.');
    }
    const sock = this.connect();
    const actionId = generateActionId();
    return new Promise((resolve, reject) => {
      sock.emit(
        'game:rematch',
        { actionId, expectedVersion: this.latestStateVersion },
        (res: { success: boolean; lobby?: Lobby; error?: string }) => {
          if (res?.lobby) this.syncLobbyTracking(res.lobby);
          if (res?.success) {
            resolve();
          } else {
            reject(new Error(res?.error || 'Revanche fehlgeschlagen.'));
          }
        }
      );
    });
  }

  public async leaveLobby(): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      this.activeLobbyId = null;
      this.reconnectToken = undefined;
      return;
    }
    return new Promise((resolve) => {
      this.socket?.emit('lobby:leave', () => {
        this.activeLobbyId = null;
        this.reconnectToken = undefined;
        resolve();
      });
    });
  }

  private addSocketListener(event: string, cb: (...args: any[]) => void): () => void {
    if (!this.customListeners.has(event)) {
      this.customListeners.set(event, new Set());
    }
    this.customListeners.get(event)!.add(cb);

    if (this.socket) {
      this.socket.on(event, cb);
    }

    return () => {
      this.customListeners.get(event)?.delete(cb);
      this.socket?.off(event, cb);
    };
  }

  public onLobbyUpdated(cb: (data: { lobby: Lobby; message?: string }) => void): () => void {
    return this.addSocketListener('lobby:updated', cb);
  }

  public onGameStarted(cb: (data: { lobby: Lobby }) => void): () => void {
    return this.addSocketListener('game:started', cb);
  }

  public onGameState(cb: (data: { gameState: any; status: string; lobby: Lobby }) => void): () => void {
    return this.addSocketListener('game:state', cb);
  }

  public onGameRestarted(cb: (data: { lobby: Lobby }) => void): () => void {
    return this.addSocketListener('game:restarted', cb);
  }

  public onPlayerDisconnected(
    cb: (data: {
      playerId: string;
      playerName: string;
      reconnectDeadline?: number;
      lobby: Lobby;
    }) => void
  ): () => void {
    return this.addSocketListener('lobby:player-disconnected', cb);
  }

  public onPlayerOffline(
    cb: (data: { playerId: string; playerName: string; lobby: Lobby }) => void
  ): () => void {
    return this.addSocketListener('lobby:player-offline', cb);
  }

  public onHostChanged(
    cb: (data: {
      lobby: Lobby;
      newHostId: string;
      newHostName: string;
      previousHostId: string;
      reason: string;
    }) => void
  ): () => void {
    return this.addSocketListener('lobby:host-changed', cb);
  }

  public onLobbyExpired(cb: (data: { lobbyId: string; code: string }) => void): () => void {
    return this.addSocketListener('lobby:expired', cb);
  }

  public onSessionExpired(cb: (data: { reason?: string; message?: string }) => void): () => void {
    return this.addSocketListener('session:expired', cb);
  }

  public onSessionConflict(cb: (data: { message?: string }) => void): () => void {
    return this.addSocketListener('session:conflict', cb);
  }

  public onStateSync(cb: (data: { lobby: Lobby }) => void): () => void {
    return this.addSocketListener('lobby:state-sync', cb);
  }

  public onListUpdated(cb: () => void): () => void {
    return this.addSocketListener('lobby:list-updated', cb);
  }

  public onLiveStrokes(cb: (data: { strokes: any[] }) => void): () => void {
    return this.addSocketListener('draw:live-strokes', cb);
  }

  public onLiveClear(cb: () => void): () => void {
    return this.addSocketListener('draw:live-clear', cb);
  }

  public onLiveUndo(cb: (data: { strokes: any[] }) => void): () => void {
    return this.addSocketListener('draw:live-undo', cb);
  }
}

export const socketService = new SocketService();

subscribeUserProfile((profile) => {
  socketService.updatePlayerProfile(profile);
});
