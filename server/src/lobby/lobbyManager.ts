import {
  Lobby,
  LobbySummary,
  Player,
} from '../types/multiplayer.js';
import { gameRegistry } from '../games/registry.js';

// Zufälliger 5-stelliger Großbuchstaben/Zahlen-Code
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOBBY_EXPIRE_MS = 2 * 60 * 60 * 1000; // 2 Stunden Gültigkeit

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

export function getDefaultSettings(gameId: string): Record<string, any> {
  if (gameId === 'draw-and-guess') {
    return {
      rounds: 3,
      roundDuration: 60,
      hints: true,
      category: 'Alle',
    };
  }
  if (gameId === 'connect' || gameId === 'tic-tac-toe') {
    return {
      rounds: 3,
    };
  }
  return {};
}

function generateLobbyCode(existingCodes: Set<string>): string {
  let code = '';
  for (let attempt = 0; attempt < 100; attempt++) {
    code = '';
    for (let i = 0; i < 5; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    if (!existingCodes.has(code)) break;
  }
  return code;
}

export class LobbyManager {
  private lobbies = new Map<string, Lobby>();
  private socketToLobby = new Map<string, string>(); // socketId -> lobbyId
  private disconnectTimers = new Map<string, NodeJS.Timeout>(); // userId -> Timer

  constructor() {
    const cleanupTimer = setInterval(() => {
      this.cleanupExpiredLobbies();
    }, 10 * 60 * 1000);
    cleanupTimer.unref?.();
  }

  private deleteLobby(lobbyId: string): void {
    const lobby = this.lobbies.get(lobbyId);
    if (lobby) {
      for (const p of lobby.players) {
        this.socketToLobby.delete(p.socketId);
        const timer = this.disconnectTimers.get(p.id);
        if (timer) {
          clearTimeout(timer);
          this.disconnectTimers.delete(p.id);
        }
      }
    }
    this.lobbies.delete(lobbyId);
  }

  private getExistingCodes(): Set<string> {
    const codes = new Set<string>();
    for (const lobby of this.lobbies.values()) {
      codes.add(lobby.code);
    }
    return codes;
  }

  // Abgelaufene Lobbys bereinigen
  public cleanupExpiredLobbies(): void {
    const now = Date.now();
    for (const [id, lobby] of this.lobbies.entries()) {
      if (lobby.expiresAt && now > lobby.expiresAt) {
        this.deleteLobby(id);
      }
    }
  }

  // 1. Offene öffentliche Lobbys abrufen (Lobbys sind immer privat - kein Public Listing)
  public getPublicLobbies(_gameId: string): LobbySummary[] {
    return [];
  }

  // 2. Lobby erstellen (inkl. TV-Modus mit QR-Code)
  public createLobby(params: {
    name: string;
    isPrivate: boolean;
    gameId: string;
    userProfile: { id: string; name: string; avatar: any };
    socketId: string;
    isTvMode?: boolean;
  }): { lobby: Lobby | null; error?: string } {
    const { name, gameId, userProfile, socketId, isTvMode } = params;

    const gameDef = gameRegistry.get(gameId);
    if (!gameDef) {
      return { lobby: null, error: `Spiel mit ID "${gameId}" ist nicht im System registriert.` };
    }

    // Vorherige Lobby verlassen
    this.leaveCurrentLobby(socketId);

    const lobbyId = `lob_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const code = generateLobbyCode(this.getExistingCodes());
    const now = Date.now();

    const hostPlayer: Player = {
      id: userProfile.id,
      socketId,
      name: isTvMode ? '📺 Fernseher' : (userProfile.name.trim() || 'Spieler'),
      avatar: userProfile.avatar,
      isReady: isTvMode ? false : true,
      isHost: true,
      connected: true,
      isTvScreen: Boolean(isTvMode),
    };

    const fallbackName = isTvMode
      ? 'TV-Runde'
      : SIMPLE_LOBBY_NAMES[Math.floor(Math.random() * SIMPLE_LOBBY_NAMES.length)];

    const lobby: Lobby = {
      id: lobbyId,
      code,
      name: name.trim().slice(0, 30) || fallbackName,
      isPrivate: true, // Lobbys sind ausnahmslos privat
      gameId,
      minPlayers: gameDef.minPlayers,
      maxPlayers: gameDef.maxPlayers,
      hostId: hostPlayer.id,
      players: [hostPlayer],
      status: 'waiting',
      createdAt: now,
      expiresAt: now + LOBBY_EXPIRE_MS,
      isTvMode: Boolean(isTvMode),
      settings: getDefaultSettings(gameId),
      gameState: null,
      rematchVotes: [],
    };

    this.lobbies.set(lobbyId, lobby);
    this.socketToLobby.set(socketId, lobbyId);

    return { lobby };
  }

  // Schnelle Code-Prüfung / Suche
  public findLobbyByCode(code: string): Lobby | undefined {
    this.cleanupExpiredLobbies();
    const cleanQuery = code.trim().toUpperCase();
    for (const l of this.lobbies.values()) {
      if (l.code.toUpperCase() === cleanQuery || l.id === code) {
        return l;
      }
    }
    return undefined;
  }

  // 3. Lobby beitreten per ID oder Code
  public joinLobby(params: {
    lobbyIdOrCode: string;
    userProfile: { id: string; name: string; avatar: any };
    socketId: string;
  }): { lobby: Lobby | null; error?: string } {
    this.cleanupExpiredLobbies();
    const { lobbyIdOrCode, userProfile, socketId } = params;
    const cleanQuery = lobbyIdOrCode.trim().toUpperCase();

    let lobby: Lobby | undefined;
    for (const l of this.lobbies.values()) {
      if (l.id === lobbyIdOrCode || l.code.toUpperCase() === cleanQuery) {
        lobby = l;
        break;
      }
    }

    if (!lobby) {
      return { lobby: null, error: 'Lobby wurde nicht gefunden oder existiert nicht mehr.' };
    }

    if (lobby.expiresAt && Date.now() > lobby.expiresAt) {
      this.deleteLobby(lobby.id);
      return { lobby: null, error: 'Diese Lobby ist abgelaufen.' };
    }

    // Spieler-Reconnect / Refresh
    const existingPlayer = lobby.players.find((p) => p.id === userProfile.id);
    if (existingPlayer) {
      if (existingPlayer.socketId && existingPlayer.socketId !== socketId) {
        this.socketToLobby.delete(existingPlayer.socketId);
      }
      const timer = this.disconnectTimers.get(existingPlayer.id);
      if (timer) {
        clearTimeout(timer);
        this.disconnectTimers.delete(existingPlayer.id);
      }
      existingPlayer.socketId = socketId;
      existingPlayer.connected = true;
      existingPlayer.name = userProfile.name;
      existingPlayer.avatar = userProfile.avatar;
      this.socketToLobby.set(socketId, lobby.id);
      return { lobby };
    }

    if (lobby.status !== 'waiting') {
      return { lobby: null, error: 'Dieses Spiel läuft bereits.' };
    }

    const activePlayers = lobby.isTvMode
      ? lobby.players.filter((p) => !p.isTvScreen)
      : lobby.players;

    if (activePlayers.length >= lobby.maxPlayers) {
      return { lobby: null, error: 'Die Lobby ist bereits voll.' };
    }

    const newPlayer: Player = {
      id: userProfile.id,
      socketId,
      name: userProfile.name.trim() || 'Herausforderer',
      avatar: userProfile.avatar,
      isReady: false,
      isHost: false,
      connected: true,
      isTvScreen: false,
    };

    lobby.players.push(newPlayer);
    this.socketToLobby.set(socketId, lobby.id);

    return { lobby };
  }

  // 4. Bereit-Status umschalten
  public toggleReady(socketId: string): { lobby: Lobby | null; error?: string } {
    const lobbyId = this.socketToLobby.get(socketId);
    if (!lobbyId) return { lobby: null, error: 'Keine aktive Lobby.' };

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return { lobby: null, error: 'Lobby nicht gefunden.' };

    const player = lobby.players.find((p) => p.socketId === socketId);
    if (!player) return { lobby: null, error: 'Spieler nicht gefunden.' };

    // TV-Bildschirm ist kein Mitspieler und muss nicht bereit klicken
    if (player.isTvScreen) {
      return { lobby: null, error: 'Der Fernseher ist kein Mitspieler und muss nicht bereit klicken.' };
    }

    player.isReady = !player.isReady;
    return { lobby };
  }

  // 4b. Spieleinstellungen vor Start anpassen (Host)
  public updateSettings(
    socketId: string,
    newSettings: Record<string, any>
  ): { lobby: Lobby | null; error?: string } {
    const lobbyId = this.socketToLobby.get(socketId);
    if (!lobbyId) return { lobby: null, error: 'Keine aktive Lobby.' };

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return { lobby: null, error: 'Lobby nicht gefunden.' };

    if (lobby.status !== 'waiting') {
      return { lobby: null, error: 'Einstellungen können nur vor Spielstart geändert werden.' };
    }

    const player = lobby.players.find((p) => p.socketId === socketId);
    if (!player) return { lobby: null, error: 'Spieler nicht gefunden.' };

    const isRoomLeader = lobby.isTvMode
      ? lobby.players.find((p) => !p.isTvScreen)?.id === player.id || player.isHost
      : player.isHost;

    if (!isRoomLeader) {
      return { lobby: null, error: 'Nur der Host kann die Spieleinstellungen ändern.' };
    }

    lobby.settings = {
      ...(lobby.settings || getDefaultSettings(lobby.gameId)),
      ...newSettings,
    };

    return { lobby };
  }

  // 5. Spiel starten (generisch über GameRegistry)
  public startGame(socketId: string): { lobby: Lobby | null; error?: string } {
    const lobbyId = this.socketToLobby.get(socketId);
    if (!lobbyId) return { lobby: null, error: 'Keine aktive Lobby.' };

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return { lobby: null, error: 'Lobby nicht gefunden.' };

    const player = lobby.players.find((p) => p.socketId === socketId);
    if (!player) return { lobby: null, error: 'Spieler nicht gefunden.' };

    const activePlayers = lobby.isTvMode
      ? lobby.players.filter((p) => !p.isTvScreen)
      : lobby.players;

    // Start-Berechtigung:
    // Im TV-Modus darf der Host (Fernseher) ODER jeder Smartphone-Spieler starten, wenn alle bereit sind
    // Im normalen Modus nur der Host
    if (!lobby.isTvMode && !player.isHost) {
      return { lobby: null, error: 'Nur der Host kann das Spiel starten.' };
    }

    if (activePlayers.length < lobby.minPlayers) {
      return { lobby: null, error: `Es werden mindestens ${lobby.minPlayers} Spieler benötigt.` };
    }

    const notReady = activePlayers.filter((p) => !p.isReady);
    if (notReady.length > 0) {
      return { lobby: null, error: 'Noch nicht alle Smartphone-Spieler sind bereit.' };
    }

    const gameDef = gameRegistry.get(lobby.gameId);
    if (!gameDef) {
      return { lobby: null, error: `Spiellogik für "${lobby.gameId}" nicht gefunden.` };
    }

    // Zentraler generischer Spielstart
    lobby.gameState = gameDef.initGameState(activePlayers, undefined, lobby.settings);
    lobby.status = 'in-game';
    lobby.rematchVotes = [];

    return { lobby };
  }

  // 6. Spielzug ausführen (generisch über GameRegistry)
  public makeMove(
    socketId: string,
    moveData: any
  ): { lobby: Lobby | null; error?: string } {
    const lobbyId = this.socketToLobby.get(socketId);
    if (!lobbyId) return { lobby: null, error: 'Keine aktive Lobby.' };

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby || !lobby.gameState || lobby.status !== 'in-game') {
      return { lobby: null, error: 'Kein aktives Spiel.' };
    }

    const player = lobby.players.find((p) => p.socketId === socketId);
    if (!player) return { lobby: null, error: 'Spieler nicht gefunden.' };

    // TV-Bildschirm darf keine Spielzüge ausführen (nur Anzeige)
    if (player.isTvScreen) {
      return { lobby: null, error: 'Der TV-Bildschirm ist nur eine Anzeige.' };
    }

    const gameDef = gameRegistry.get(lobby.gameId);
    if (!gameDef) {
      return { lobby: null, error: `Spiellogik für "${lobby.gameId}" nicht gefunden.` };
    }

    const activePlayers = lobby.isTvMode
      ? lobby.players.filter((p) => !p.isTvScreen)
      : lobby.players;

    // Zentraler autoritativer Spielzug
    const result = gameDef.validateAndApplyMove({
      state: lobby.gameState,
      players: activePlayers,
      playerId: player.id,
      move: moveData,
    });

    if (!result.valid) {
      return { lobby: null, error: result.error || 'Ungültiger Spielzug.' };
    }

    lobby.gameState = result.state;
    if (result.state.status !== 'playing') {
      lobby.status = 'finished';
    }

    return { lobby };
  }

  // 7. Rematch / Revanche anfordern (generisch)
  public requestRematch(socketId: string): { lobby: Lobby | null; restarted: boolean; error?: string } {
    const lobbyId = this.socketToLobby.get(socketId);
    if (!lobbyId) return { lobby: null, restarted: false, error: 'Keine aktive Lobby.' };

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return { lobby: null, restarted: false, error: 'Lobby nicht gefunden.' };

    const player = lobby.players.find((p) => p.socketId === socketId);
    if (!player) return { lobby: null, restarted: false, error: 'Spieler nicht gefunden.' };

    if (!lobby.rematchVotes.includes(player.id)) {
      lobby.rematchVotes.push(player.id);
    }

    const activePlayers = lobby.isTvMode
      ? lobby.players.filter((p) => !p.isTvScreen)
      : lobby.players;

    // Wenn alle aktiven Spieler zustimmen, Spiel neu starten
    if (lobby.rematchVotes.length >= activePlayers.length && activePlayers.length >= lobby.minPlayers) {
      const gameDef = gameRegistry.get(lobby.gameId);
      if (!gameDef) {
        return { lobby: null, restarted: false, error: 'Spiellogik nicht gefunden.' };
      }

      // Starter wechseln
      const previousStarter = lobby.gameState?.currentTurn;
      const nextStarter = activePlayers.find((p) => p.id !== previousStarter)?.id;

      lobby.gameState = gameDef.initGameState(activePlayers, nextStarter, lobby.settings);
      lobby.status = 'in-game';
      lobby.rematchVotes = [];
      return { lobby, restarted: true };
    }

    return { lobby, restarted: false };
  }

  // 8. Lobby verlassen (generisch)
  public leaveCurrentLobby(socketId: string): {
    lobbyId: string | null;
    lobby: Lobby | null;
    wasHost: boolean;
    deleted: boolean;
  } {
    const lobbyId = this.socketToLobby.get(socketId);
    if (!lobbyId) {
      return { lobbyId: null, lobby: null, wasHost: false, deleted: false };
    }

    this.socketToLobby.delete(socketId);
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return { lobbyId, lobby: null, wasHost: false, deleted: false };
    }

    const leavingPlayerIndex = lobby.players.findIndex((p) => p.socketId === socketId);
    if (leavingPlayerIndex === -1) {
      return { lobbyId, lobby, wasHost: false, deleted: false };
    }

    const leavingPlayer = lobby.players[leavingPlayerIndex];
    const wasHost = leavingPlayer.isHost;

    const existingTimer = this.disconnectTimers.get(leavingPlayer.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.disconnectTimers.delete(leavingPlayer.id);
    }

    // Wenn der Fernseher im TV-Modus die Lobby verlässt, wird die TV-Lobby geschlossen
    if (leavingPlayer.isTvScreen) {
      this.deleteLobby(lobbyId);
      return { lobbyId, lobby: null, wasHost: true, deleted: true };
    }

    // Spieler entfernen
    lobby.players.splice(leavingPlayerIndex, 1);

    // Wenn keine Spieler mehr da sind -> Lobby sofort löschen
    if (lobby.players.length === 0) {
      this.deleteLobby(lobbyId);
      return { lobbyId, lobby: null, wasHost, deleted: true };
    }

    // Wenn der Host geht -> Nächster Spieler wird Host
    if (wasHost && lobby.players.length > 0) {
      lobby.players[0].isHost = true;
      lobby.players[0].isReady = true;
      lobby.hostId = lobby.players[0].id;
    }

    // Wenn das Spiel lief, optionalen Game-Hook aufrufen oder Standard-Gewinn setzen
    if (lobby.status === 'in-game' && lobby.gameState) {
      const activePlayers = lobby.isTvMode
        ? lobby.players.filter((p) => !p.isTvScreen)
        : lobby.players;

      const gameDef = gameRegistry.get(lobby.gameId);
      if (gameDef?.onPlayerLeave) {
        lobby.gameState = gameDef.onPlayerLeave(lobby.gameState, leavingPlayer.id, activePlayers);
      } else if (activePlayers.length > 0) {
        lobby.gameState.status = 'won';
        lobby.gameState.winnerId = activePlayers[0].id;
      }
    }

    return { lobbyId, lobby, wasHost, deleted: false };
  }

  // 9. Verbindungsabbruch behandeln (Grace Period für Wiederverbindung)
  public handleDisconnect(socketId: string): {
    lobbyId: string | null;
    lobby: Lobby | null;
    player: Player | null;
  } {
    const lobbyId = this.socketToLobby.get(socketId);
    if (!lobbyId) return { lobbyId: null, lobby: null, player: null };

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return { lobbyId, lobby: null, player: null };

    const player = lobby.players.find((p) => p.socketId === socketId);
    if (!player) return { lobbyId, lobby, player: null };

    player.connected = false;

    const oldTimer = this.disconnectTimers.get(player.id);
    if (oldTimer) {
      clearTimeout(oldTimer);
    }

    // Grace Period: 45 Sekunden zum Wiederverbinden
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(player.id);
      if (!player.connected) {
        this.leaveCurrentLobby(socketId);
      }
    }, 45000);
    timer.unref?.();

    this.disconnectTimers.set(player.id, timer);

    return { lobbyId, lobby, player };
  }

  // 10. Wiederverbinden
  public reconnectPlayer(params: {
    userId: string;
    socketId: string;
  }): { lobby: Lobby | null } {
    const { userId, socketId } = params;

    const timer = this.disconnectTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(userId);
    }

    for (const lobby of this.lobbies.values()) {
      const player = lobby.players.find((p) => p.id === userId);
      if (player) {
        if (player.socketId && player.socketId !== socketId) {
          this.socketToLobby.delete(player.socketId);
        }
        player.socketId = socketId;
        player.connected = true;
        this.socketToLobby.set(socketId, lobby.id);
        return { lobby };
      }
    }

    return { lobby: null };
  }

  public getLobbyById(lobbyId: string): Lobby | undefined {
    return this.lobbies.get(lobbyId);
  }

  public getLobbyBySocketId(socketId: string): Lobby | undefined {
    const lobbyId = this.socketToLobby.get(socketId);
    if (!lobbyId) return undefined;
    return this.lobbies.get(lobbyId);
  }
}

export const lobbyManager = new LobbyManager();
