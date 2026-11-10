import { io, Socket } from 'socket.io-client';
import type {
  Lobby,
  LobbySummary,
  MultiplayerGameId,
} from '../types/multiplayer';
import { getUserProfile, STORAGE_KEYS } from '../utils/userProfile';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

class SocketService {
  private socket: Socket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private activeLobbyId: string | null = null;

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      for (const listener of this.statusListeners) {
        try {
          listener(newStatus);
        } catch {
          // ignore
        }
      }
    }
  }

  public getSocketUrl(): string {
    try {
      const custom = localStorage.getItem(STORAGE_KEYS.SOCKET_URL);
      if (custom && custom.trim().length > 0) return custom.trim();
    } catch {
      // ignore
    }
    const envUrl = import.meta.env.VITE_SOCKET_URL;
    if (envUrl && typeof envUrl === 'string') return envUrl.trim();
    return ''; // Relativ (über Vite-Proxy oder gleicher Host)
  }

  public setSocketUrl(url: string | null) {
    try {
      if (!url || url.trim().length === 0) {
        localStorage.removeItem(STORAGE_KEYS.SOCKET_URL);
      } else {
        localStorage.setItem(STORAGE_KEYS.SOCKET_URL, url.trim());
      }
    } catch {
      // ignore
    }
    // Neu verbinden mit neuer URL
    this.disconnect();
    this.connect();
  }

  public connect(): Socket {
    if (this.socket && (this.socket.connected || this.status === 'connecting')) {
      return this.socket;
    }

    this.setStatus('connecting');
    const targetUrl = this.getSocketUrl();

    this.socket = io(targetUrl || window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      this.setStatus('connected');
      // Automatisch in bestehende Lobby reconnecten falls aktiv
      const profile = getUserProfile();
      if (profile && this.activeLobbyId) {
        this.socket?.emit('lobby:reconnect', { userId: profile.id });
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.setStatus('disconnected');
      if (reason === 'io server disconnect') {
        // Server hat Verbindung getrennt, manuell wiederverbinden
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', () => {
      this.setStatus('error');
    });

    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.setStatus('disconnected');
    this.activeLobbyId = null;
  }

  public setActiveLobbyId(id: string | null) {
    this.activeLobbyId = id;
  }

  // ─── API METHODEN ───

  public async fetchLobbies(gameId: MultiplayerGameId): Promise<LobbySummary[]> {
    const s = this.connect();
    return new Promise((resolve, reject) => {
      s.emit(
        'lobby:list',
        { gameId },
        (res: { success: boolean; lobbies?: LobbySummary[]; error?: string }) => {
          if (res.success && res.lobbies) {
            resolve(res.lobbies);
          } else {
            reject(new Error(res.error || 'Lobbys konnten nicht geladen werden.'));
          }
        }
      );
    });
  }

  public async createLobby(
    name: string,
    isPrivate: boolean,
    gameId: MultiplayerGameId
  ): Promise<Lobby> {
    const s = this.connect();
    const userProfile = getUserProfile();

    return new Promise((resolve, reject) => {
      s.emit(
        'lobby:create',
        { name, isPrivate, gameId, userProfile },
        (res: { success: boolean; lobby?: Lobby; error?: string }) => {
          if (res.success && res.lobby) {
            this.activeLobbyId = res.lobby.id;
            resolve(res.lobby);
          } else {
            reject(new Error(res.error || 'Lobby konnte nicht erstellt werden.'));
          }
        }
      );
    });
  }

  public async joinLobby(lobbyIdOrCode: string): Promise<Lobby> {
    const s = this.connect();
    const userProfile = getUserProfile();

    return new Promise((resolve, reject) => {
      s.emit(
        'lobby:join',
        { lobbyIdOrCode, userProfile },
        (res: { success: boolean; lobby?: Lobby; error?: string }) => {
          if (res.success && res.lobby) {
            this.activeLobbyId = res.lobby.id;
            resolve(res.lobby);
          } else {
            reject(new Error(res.error || 'Lobby konnte nicht beigetreten werden.'));
          }
        }
      );
    });
  }

  public async toggleReady(): Promise<Lobby> {
    const s = this.connect();
    return new Promise((resolve, reject) => {
      s.emit('lobby:ready', (res: { success: boolean; lobby?: Lobby; error?: string }) => {
        if (res.success && res.lobby) {
          resolve(res.lobby);
        } else {
          reject(new Error(res.error || 'Bereit-Status konnte nicht geändert werden.'));
        }
      });
    });
  }

  public async startLobby(): Promise<Lobby> {
    const s = this.connect();
    return new Promise((resolve, reject) => {
      s.emit('lobby:start', (res: { success: boolean; lobby?: Lobby; error?: string }) => {
        if (res.success && res.lobby) {
          resolve(res.lobby);
        } else {
          reject(new Error(res.error || 'Spiel konnte nicht gestartet werden.'));
        }
      });
    });
  }

  public async sendMove(moveData: any): Promise<void> {
    const s = this.connect();
    return new Promise((resolve, reject) => {
      s.emit('game:move', moveData, (res: { success: boolean; error?: string }) => {
        if (res.success) {
          resolve();
        } else {
          reject(new Error(res.error || 'Ungültiger Zug.'));
        }
      });
    });
  }

  public async requestRematch(): Promise<void> {
    const s = this.connect();
    return new Promise((resolve, reject) => {
      s.emit('game:rematch', (res: { success: boolean; error?: string }) => {
        if (res.success) {
          resolve();
        } else {
          reject(new Error(res.error || 'Revanche fehlgeschlagen.'));
        }
      });
    });
  }

  public async leaveLobby(): Promise<void> {
    const s = this.connect();
    this.activeLobbyId = null;
    return new Promise((resolve) => {
      s.emit('lobby:leave', () => {
        resolve();
      });
    });
  }

  // ─── EVENT LISTENER REGISTRIERUNG ───

  public onLobbyUpdated(cb: (data: { lobby: Lobby; message?: string }) => void): () => void {
    const s = this.connect();
    s.on('lobby:updated', cb);
    return () => s.off('lobby:updated', cb);
  }

  public onGameStarted(cb: (data: { lobby: Lobby }) => void): () => void {
    const s = this.connect();
    s.on('game:started', cb);
    return () => s.off('game:started', cb);
  }

  public onGameState(cb: (data: { gameState: any; status: string; lobby: Lobby }) => void): () => void {
    const s = this.connect();
    s.on('game:state', cb);
    return () => s.off('game:state', cb);
  }

  public onGameRestarted(cb: (data: { lobby: Lobby }) => void): () => void {
    const s = this.connect();
    s.on('game:restarted', cb);
    return () => s.off('game:restarted', cb);
  }

  public onPlayerDisconnected(cb: (data: { playerId: string; playerName: string; lobby: Lobby }) => void): () => void {
    const s = this.connect();
    s.on('lobby:player-disconnected', cb);
    return () => s.off('lobby:player-disconnected', cb);
  }

  public onListUpdated(cb: () => void): () => void {
    const s = this.connect();
    s.on('lobby:list-updated', cb);
    return () => s.off('lobby:list-updated', cb);
  }
}

export const socketService = new SocketService();
