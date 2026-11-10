import {
  Lobby,
  LobbySummary,
  MultiplayerGameId,
  Player,
} from '../types/multiplayer.js';
import { applyTicTacToeMove, initTicTacToe } from '../games/ticTacToe.js';
import { applyConnectFourMove, initConnectFour } from '../games/connectFour.js';

// Zufälliger 5-stelliger Großbuchstaben/Zahlen-Code (ohne leicht verwechselbare Zeichen wie O, 0, I, 1)
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

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

  private getExistingCodes(): Set<string> {
    const codes = new Set<string>();
    for (const lobby of this.lobbies.values()) {
      codes.add(lobby.code);
    }
    return codes;
  }

  // 1. Offene öffentliche Lobbys abrufen
  public getPublicLobbies(gameId: MultiplayerGameId): LobbySummary[] {
    const list: LobbySummary[] = [];
    for (const lobby of this.lobbies.values()) {
      if (
        lobby.gameId === gameId &&
        !lobby.isPrivate &&
        lobby.status === 'waiting' &&
        lobby.players.length < lobby.maxPlayers
      ) {
        const host = lobby.players.find((p) => p.isHost);
        list.push({
          id: lobby.id,
          code: lobby.code,
          name: lobby.name,
          isPrivate: lobby.isPrivate,
          gameId: lobby.gameId,
          maxPlayers: lobby.maxPlayers,
          playerCount: lobby.players.length,
          hostName: host ? host.name : 'Unbekannt',
          status: lobby.status,
          createdAt: lobby.createdAt,
        });
      }
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  // 2. Lobby erstellen
  public createLobby(params: {
    name: string;
    isPrivate: boolean;
    gameId: MultiplayerGameId;
    userProfile: { id: string; name: string; avatar: any };
    socketId: string;
  }): { lobby: Lobby; error?: string } {
    const { name, isPrivate, gameId, userProfile, socketId } = params;

    // Falls der Nutzer bereits in einer Lobby ist, vorher verlassen
    this.leaveCurrentLobby(socketId);

    const lobbyId = `lob_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const code = generateLobbyCode(this.getExistingCodes());

    const hostPlayer: Player = {
      id: userProfile.id,
      socketId,
      name: userProfile.name.trim() || 'Spieler',
      avatar: userProfile.avatar,
      isReady: true,
      isHost: true,
      connected: true,
    };

    const lobby: Lobby = {
      id: lobbyId,
      code,
      name: name.trim().slice(0, 30) || `${hostPlayer.name}s Runde`,
      isPrivate: Boolean(isPrivate),
      gameId,
      maxPlayers: 2, // Standard für 2-Spieler-Duelle (Connect 4 / Tic Tac Toe)
      hostId: hostPlayer.id,
      players: [hostPlayer],
      status: 'waiting',
      createdAt: Date.now(),
      gameState: null,
      rematchVotes: [],
    };

    this.lobbies.set(lobbyId, lobby);
    this.socketToLobby.set(socketId, lobbyId);

    return { lobby };
  }

  // 3. Lobby beitreten per ID oder Code
  public joinLobby(params: {
    lobbyIdOrCode: string;
    userProfile: { id: string; name: string; avatar: any };
    socketId: string;
  }): { lobby: Lobby | null; error?: string } {
    const { lobbyIdOrCode, userProfile, socketId } = params;
    const cleanQuery = lobbyIdOrCode.trim().toUpperCase();

    // Suchen nach lobby.id oder lobby.code
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

    // Prüfen, ob der Spieler bereits in der Lobby ist (z. B. Reconnect / Refresh)
    const existingPlayer = lobby.players.find((p) => p.id === userProfile.id);
    if (existingPlayer) {
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

    if (lobby.players.length >= lobby.maxPlayers) {
      return { lobby: null, error: 'Die Lobby ist bereits voll.' };
    }

    // Spieler hinzufügen
    const newPlayer: Player = {
      id: userProfile.id,
      socketId,
      name: userProfile.name.trim() || 'Herausforderer',
      avatar: userProfile.avatar,
      isReady: false,
      isHost: false,
      connected: true,
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

    player.isReady = !player.isReady;
    return { lobby };
  }

  // 5. Spiel starten (nur durch Host)
  public startGame(socketId: string): { lobby: Lobby | null; error?: string } {
    const lobbyId = this.socketToLobby.get(socketId);
    if (!lobbyId) return { lobby: null, error: 'Keine aktive Lobby.' };

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return { lobby: null, error: 'Lobby nicht gefunden.' };

    const player = lobby.players.find((p) => p.socketId === socketId);
    if (!player || !player.isHost) {
      return { lobby: null, error: 'Nur der Host kann das Spiel starten.' };
    }

    if (lobby.players.length < lobby.maxPlayers) {
      return { lobby: null, error: `Es werden ${lobby.maxPlayers} Spieler benötigt.` };
    }

    const notReady = lobby.players.filter((p) => !p.isReady);
    if (notReady.length > 0) {
      return { lobby: null, error: 'Noch nicht alle Spieler sind bereit.' };
    }

    // Spielzustand initialisieren
    if (lobby.gameId === 'tic-tac-toe') {
      lobby.gameState = initTicTacToe(lobby.players);
    } else if (lobby.gameId === 'connect') {
      lobby.gameState = initConnectFour(lobby.players);
    } else {
      return { lobby: null, error: 'Unbekanntes Spiel.' };
    }

    lobby.status = 'in-game';
    lobby.rematchVotes = [];

    return { lobby };
  }

  // 6. Spielzug ausführen
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

    if (lobby.gameId === 'tic-tac-toe') {
      const res = applyTicTacToeMove(
        lobby.gameState as any,
        lobby.players,
        player.id,
        moveData.cellIndex
      );
      if (!res.valid) return { lobby: null, error: res.error };
      lobby.gameState = res.state;
      if (res.state.status !== 'playing') {
        lobby.status = 'finished';
      }
    } else if (lobby.gameId === 'connect') {
      const res = applyConnectFourMove(
        lobby.gameState as any,
        lobby.players,
        player.id,
        moveData.col
      );
      if (!res.valid) return { lobby: null, error: res.error };
      lobby.gameState = res.state;
      if (res.state.status !== 'playing') {
        lobby.status = 'finished';
      }
    }

    return { lobby };
  }

  // 7. Rematch / Revanche anfordern
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

    // Wenn alle Spieler zustimmen, Spiel neu starten
    if (lobby.rematchVotes.length >= lobby.players.length && lobby.players.length === lobby.maxPlayers) {
      // Starter rotieren (der bisherige Zweite fängt an)
      const previousStarter = lobby.gameState?.currentTurn;
      const nextStarter = lobby.players.find((p) => p.id !== previousStarter)?.id;

      if (lobby.gameId === 'tic-tac-toe') {
        lobby.gameState = initTicTacToe(lobby.players, nextStarter);
      } else if (lobby.gameId === 'connect') {
        lobby.gameState = initConnectFour(lobby.players, nextStarter);
      }

      lobby.status = 'in-game';
      lobby.rematchVotes = [];
      return { lobby, restarted: true };
    }

    return { lobby, restarted: false };
  }

  // 8. Lobby verlassen
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

    // Spieler entfernen
    lobby.players.splice(leavingPlayerIndex, 1);

    // Wenn keine Spieler mehr da sind -> Lobby sofort löschen
    if (lobby.players.length === 0) {
      this.lobbies.delete(lobbyId);
      return { lobbyId, lobby: null, wasHost, deleted: true };
    }

    // Wenn der Host geht -> Nächster Spieler wird Host
    if (wasHost && lobby.players.length > 0) {
      lobby.players[0].isHost = true;
      lobby.players[0].isReady = true;
      lobby.hostId = lobby.players[0].id;
    }

    // Wenn das Spiel lief und jemand geht, Spielzustand anpassen
    if (lobby.status === 'in-game') {
      lobby.status = 'finished';
      if (lobby.gameState) {
        lobby.gameState.status = 'won';
        lobby.gameState.winnerId = lobby.players[0].id; // Verbleibender Spieler gewinnt
      }
    }

    return { lobbyId, lobby, wasHost, deleted: false };
  }

  // 9. Verbindung getrennt (Disconnect)
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

    // Grace Period: 45 Sekunden Zeit zum Wiederverbinden
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(player.id);
      // Wenn immer noch nicht verbunden, endgültig entfernen
      if (!player.connected) {
        this.leaveCurrentLobby(socketId);
      }
    }, 45000);

    this.disconnectTimers.set(player.id, timer);

    return { lobbyId, lobby, player };
  }

  // 10. Wiederverbinden nach Verbindungsabbruch
  public reconnectPlayer(params: {
    userId: string;
    socketId: string;
  }): { lobby: Lobby | null } {
    const { userId, socketId } = params;

    // Laufenden Disconnect-Timer abbrechen
    const timer = this.disconnectTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(userId);
    }

    for (const lobby of this.lobbies.values()) {
      const player = lobby.players.find((p) => p.id === userId);
      if (player) {
        player.socketId = socketId;
        player.connected = true;
        this.socketToLobby.set(socketId, lobby.id);
        return { lobby };
      }
    }

    return { lobby: null };
  }

  public getLobbyBySocket(socketId: string): Lobby | null {
    const lobbyId = this.socketToLobby.get(socketId);
    return lobbyId ? this.lobbies.get(lobbyId) || null : null;
  }
}

export const lobbyManager = new LobbyManager();
