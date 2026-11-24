import type { Server as SocketIOServer, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '@projektbox/shared/events';
import {
  DrawStrokesSchema,
  EVENT_MAX_PAYLOAD_BYTES,
  GameMoveSchema,
  GameRematchSchema,
  isPayloadWithinLimit,
  LobbyCreateSchema,
  LobbyGetByCodeSchema,
  LobbyJoinSchema,
  LobbyListSchema,
  LobbyReadySchema,
  LobbyReconnectSchema,
  LobbySimulateSchema,
  LobbyStartSchema,
  LobbySwitchGameSchema,
  LobbySwitchModeSchema,
  LobbyUpdateProfileSchema,
  LobbyUpdateSettingsSchema,
  SessionPingSchema,
  ZombieInputSchema,
  ZombieStateSchema,
  GoldMinerInputSchema,
  GoldMinerStateSchema,
} from '@projektbox/shared/validation';
import { LobbyManager, lobbyManager, sanitizeLobbyForClient } from '../lobby/lobbyManager.js';
import { SimulationBotRunner } from '../lobby/simulationBotRunner.js';
import { GamePhaseScheduler } from '../games/phaseScheduler.js';
import type { Lobby } from '../types/multiplayer.js';
import {
  extractBearerToken,
  parseCookieHeader,
  resolveSessionCookieName,
} from '../auth/sessionManager.js';
import { upsertPersistentPlayerProfile } from '../database/playerRepository.js';
import { cleanupSocketRateLimit, consumeRateLimit } from '../utils/rateLimiter.js';

function unpackOptionalPayloadAndCallback<TRes>(
  dataOrCallback: unknown,
  maybeCallback?: (res: TRes) => void
): { payload: unknown; callback?: (res: TRes) => void } {
  if (typeof dataOrCallback === 'function') {
    return { payload: {}, callback: dataOrCallback as (res: TRes) => void };
  }
  return { payload: dataOrCallback ?? {}, callback: maybeCallback };
}

function resolveSocketSessionToken(socket: Socket): string | undefined {
  const auth = socket.handshake.auth as Record<string, unknown> | undefined;
  const authToken = auth?.sessionToken;
  if (typeof authToken === 'string' && authToken.trim().length > 0) {
    return authToken.trim();
  }
  const bearer = extractBearerToken(socket.handshake.headers.authorization);
  if (bearer) return bearer;

  const rawRole = auth?.clientRole ?? socket.handshake.headers['x-client-role'];
  const clientRole = rawRole === 'tv' || rawRole === 'smartphone' ? rawRole : undefined;
  const cookieName = resolveSessionCookieName(clientRole);
  const cookies = parseCookieHeader(socket.handshake.headers.cookie);
  return cookies[cookieName];
}

export function registerSocketHandlers(
  io: SocketIOServer,
  manager: LobbyManager = lobbyManager
) {
  function disconnectSupersededSocket(socketId?: string) {
    if (!socketId) return;
    const oldSocket = io.sockets.sockets.get(socketId);
    if (!oldSocket) return;
    oldSocket.data.superseded = true;
    oldSocket.emit('session:conflict', {
      message: 'Deine Sitzung wurde in einem neuen Tab oder Fenster fortgesetzt.',
    });
    oldSocket.disconnect(true);
  }

  function emitLobbyEventPerViewer(
    rawOrSafeLobby: Lobby,
    eventName: string,
    buildPayload: (scopedLobby: Lobby) => Record<string, any>
  ) {
    const sourceLobby = manager.getLobbyById(rawOrSafeLobby.id) || rawOrSafeLobby;
    if (sourceLobby.gameId !== 'texas-holdem' || !sourceLobby.gameState) {
      io.to(`lobby:${sourceLobby.id}`).emit(
        eventName,
        buildPayload(sanitizeLobbyForClient(sourceLobby))
      );
      return;
    }

    for (const p of sourceLobby.players) {
      if (p.socketId && p.connected) {
        io.to(p.socketId).emit(
          eventName,
          buildPayload(sanitizeLobbyForClient(sourceLobby, p.id))
        );
      }
    }
  }

  const executeAutomatedMove = (lobbyId: string, playerId: string, move: any) => {
    const res = manager.makeMove({ lobbyId, playerId, move });
    if (!res.success || !res.lobby) return;
    emitLobbyEventPerViewer(res.lobby, SOCKET_EVENTS.GAME_STATE, (scopedLobby) => ({
      gameState: scopedLobby.gameState,
      status: scopedLobby.status,
      lobby: scopedLobby,
    }));
    syncLobbyAutomations(res.lobby);
  };

  const botRunner = new SimulationBotRunner(executeAutomatedMove);
  const phaseScheduler = new GamePhaseScheduler(executeAutomatedMove);

  function syncLobbyAutomations(lobby: Lobby) {
    botRunner.syncLobby(lobby);
    phaseScheduler.syncLobby(lobby);
  }

  function clearLobbyAutomations(lobbyId: string) {
    botRunner.clearLobby(lobbyId);
    phaseScheduler.clearLobby(lobbyId);
  }

  manager.setCallbacks({
    onPlayerExpired(lobby, player) {
      clearLobbyAutomations(lobby.id);
      emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.LOBBY_PLAYER_OFFLINE, (scopedLobby) => ({
        playerId: player.id,
        playerName: player.name,
        lobby: scopedLobby,
      }));
      emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.LOBBY_UPDATED, (scopedLobby) => ({
        lobby: scopedLobby,
        message: `${player.name} hat die Wiederverbindungsfrist überschritten.`,
      }));
      if (player.socketId) {
        const oldSock = io.sockets.sockets.get(player.socketId);
        oldSock?.emit(SOCKET_EVENTS.SESSION_EXPIRED, {
          reason: 'reconnect_timeout',
          message: 'Deine Wiederverbindungsfrist (60s) ist abgelaufen.',
        });
      }
      syncLobbyAutomations(lobby);
      io.emit(SOCKET_EVENTS.LOBBY_LIST_UPDATED, { gameId: lobby.gameId });
    },
    onHostChanged(lobby, newHost, previousHostId, reason) {
      emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.LOBBY_HOST_CHANGED, (scopedLobby) => ({
        lobby: scopedLobby,
        newHostId: newHost.id,
        newHostName: newHost.name,
        previousHostId,
        reason,
      }));
      emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.LOBBY_UPDATED, (scopedLobby) => ({
        lobby: scopedLobby,
        message: `${newHost.name} ist jetzt der neue Host.`,
      }));
    },
    onLobbyUpdated(lobby) {
      syncLobbyAutomations(lobby);
      emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.LOBBY_UPDATED, (scopedLobby) => ({
        lobby: scopedLobby,
      }));
    },
    onLobbyExpired(lobby) {
      clearLobbyAutomations(lobby.id);
      io.to(`lobby:${lobby.id}`).emit(SOCKET_EVENTS.LOBBY_EXPIRED, {
        lobbyId: lobby.id,
        code: lobby.code,
      });
      io.emit(SOCKET_EVENTS.LOBBY_LIST_UPDATED, { gameId: lobby.gameId });
    },
    onLobbyRemoved(lobbyId) {
      clearLobbyAutomations(lobbyId);
    },
  });

  // Authentifizierungs-Middleware über HttpOnly-Cookie oder Cross-Origin Session-Token
  io.use((socket, next) => {
    const rawToken = resolveSocketSessionToken(socket);
    if (rawToken) {
      const check = manager.sessionManager.verifySessionToken(rawToken);
      if (check.valid && check.session) {
        socket.data.sessionId = check.session.sessionId;
        socket.data.playerId = check.session.playerId;
        const { previousSocketId } = manager.sessionManager.bindSocket(
          check.session.sessionId,
          socket.id
        );
        if (previousSocketId) {
          disconnectSupersededSocket(previousSocketId);
        }
      } else if (check.reason === 'revoked' || check.reason === 'expired') {
        socket.data.sessionExpiredReason = check.reason;
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    if (socket.data.sessionExpiredReason) {
      socket.emit(SOCKET_EVENTS.SESSION_EXPIRED, {
        reason: socket.data.sessionExpiredReason,
        message: 'Deine Sitzung ist abgelaufen oder wurde beendet.',
      });
    }

    if (socket.recovered && socket.data.playerId) {
      const activeLobby = manager.getLobbyByPlayerId(socket.data.playerId);
      if (activeLobby) {
        const recon = manager.reconnectPlayer({
          socketId: socket.id,
          userId: socket.data.playerId,
          sessionId: socket.data.sessionId,
        });
        if (recon.success && recon.lobby) {
          const safeLobby = sanitizeLobbyForClient(recon.lobby, socket.data.playerId);
          socket.join(`lobby:${recon.lobby.id}`);
          syncLobbyAutomations(recon.lobby);
          socket.emit(SOCKET_EVENTS.LOBBY_STATE_SYNC, {
            lobby: safeLobby,
            reconnectToken: recon.reconnectToken,
          });
          emitLobbyEventPerViewer(recon.lobby, SOCKET_EVENTS.LOBBY_UPDATED, (scopedLobby) => ({
            lobby: scopedLobby,
          }));
        }
      }
    }

    // 0. Anwendungs-Heartbeat
    socket.on(
      SOCKET_EVENTS.SESSION_PING,
      async (
        data: unknown,
        callback?: (res: { serverTime: number; clientTime?: number; sessionValid: boolean }) => void
      ) => {
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.SESSION_PING))) return;
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.SESSION_PING])) return;
        const parsed = SessionPingSchema.safeParse(data ?? {});
        const clientTime = parsed.success ? parsed.data.clientTime : undefined;
        const sessionValid = socket.data.sessionId
          ? Boolean(manager.sessionManager.getSessionById(socket.data.sessionId))
          : true;
        const res = {
          serverTime: Date.now(),
          clientTime,
          sessionValid: sessionValid && !socket.data.superseded,
        };
        callback?.(res);
        socket.emit(SOCKET_EVENTS.SESSION_PONG, res);
      }
    );

    // 1. Liste offener Lobbys abrufen
    socket.on(
      SOCKET_EVENTS.LOBBY_LIST,
      async (
        data: unknown,
        callback?: (res: { success: boolean; lobbies?: any[]; error?: string }) => void
      ) => {
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.LOBBY_LIST))) {
          return callback?.({ success: false, error: 'Zu viele Anfragen. Bitte kurz warten.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.LOBBY_LIST])) {
          return callback?.({ success: false, error: 'Anfrage zu groß.' });
        }
        const parsed = LobbyListSchema.safeParse(data ?? {});
        if (!parsed.success) {
          return callback?.({ success: false, error: 'Ungültige Filterdaten.' });
        }
        try {
          const list = manager.getPublicLobbies(parsed.data.gameId);
          callback?.({ success: true, lobbies: list });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 2. Lobby erstellen
    socket.on(
      SOCKET_EVENTS.LOBBY_CREATE,
      async (
        data: unknown,
        callback?: (res: {
          success: boolean;
          lobby?: any;
          reconnectToken?: string;
          error?: string;
        }) => void
      ) => {
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Sitzung wurde in einem neuen Fenster übernommen.' });
        }
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.LOBBY_CREATE))) {
          return callback?.({ success: false, error: 'Zu viele Anfragen. Bitte kurz warten.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.LOBBY_CREATE])) {
          return callback?.({ success: false, error: 'Lobby-Daten überschreiten das Größenlimit.' });
        }
        const parsed = LobbyCreateSchema.safeParse(data);
        if (!parsed.success) {
          return callback?.({ success: false, error: 'Ungültige Lobby-Daten.' });
        }
        try {
          const effectiveProfile = socket.data.playerId
            ? { ...parsed.data.userProfile, id: socket.data.playerId }
            : parsed.data.userProfile;

          const { lobby, error, reconnectToken } = manager.createLobby({
            name: parsed.data.name,
            isPrivate: parsed.data.isPrivate,
            gameId: parsed.data.gameId,
            userProfile: effectiveProfile as any,
            socketId: socket.id,
            isTvMode: parsed.data.isTvMode,
            sessionId: socket.data.sessionId,
          });

          if (error || !lobby) {
            return callback?.({
              success: false,
              error: error || 'Lobby konnte nicht erstellt werden.',
            });
          }

          if (!parsed.data.isTvMode) {
            void upsertPersistentPlayerProfile({
              id: effectiveProfile.id,
              name: effectiveProfile.name,
              avatar: effectiveProfile.avatar,
            });
          }

          const safeLobby = sanitizeLobbyForClient(lobby);
          socket.join(`lobby:${lobby.id}`);
          callback?.({ success: true, lobby: safeLobby, reconnectToken });
          io.emit(SOCKET_EVENTS.LOBBY_LIST_UPDATED, { gameId: lobby.gameId });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 2c. Spiel direkt simulieren
    socket.on(
      SOCKET_EVENTS.LOBBY_SIMULATE,
      async (
        data: unknown,
        callback?: (res: {
          success: boolean;
          lobby?: any;
          reconnectToken?: string;
          error?: string;
        }) => void
      ) => {
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Sitzung wurde in einem neuen Fenster übernommen.' });
        }
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.LOBBY_SIMULATE))) {
          return callback?.({ success: false, error: 'Zu viele Anfragen. Bitte kurz warten.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.LOBBY_SIMULATE])) {
          return callback?.({ success: false, error: 'Simulationsdaten überschreiten das Größenlimit.' });
        }
        const parsed = LobbySimulateSchema.safeParse(data);
        if (!parsed.success) {
          return callback?.({ success: false, error: 'Ungültige Simulationsdaten.' });
        }
        try {
          const effectiveProfile = socket.data.playerId
            ? { ...parsed.data.userProfile, id: socket.data.playerId }
            : parsed.data.userProfile;

          const { lobby, error, reconnectToken } = manager.createAndStartSimulatedLobby({
            gameId: parsed.data.gameId,
            userProfile: effectiveProfile as any,
            socketId: socket.id,
            isTvMode: parsed.data.isTvMode,
            botCount: parsed.data.botCount,
            settings: parsed.data.settings,
            sessionId: socket.data.sessionId,
          });

          if (error || !lobby) {
            return callback?.({
              success: false,
              error: error || 'Simulation konnte nicht gestartet werden.',
            });
          }

          const safeLobby = sanitizeLobbyForClient(lobby, effectiveProfile.id);
          socket.join(`lobby:${lobby.id}`);
          callback?.({ success: true, lobby: safeLobby, reconnectToken });
          syncLobbyAutomations(lobby);
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 2b. Lobby per Code prüfen
    socket.on(
      SOCKET_EVENTS.LOBBY_GET_BY_CODE,
      async (
        data: unknown,
        callback?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.LOBBY_GET_BY_CODE))) {
          return callback?.({ success: false, error: 'Zu viele Code-Abfragen. Bitte kurz warten.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.LOBBY_GET_BY_CODE])) {
          return callback?.({ success: false, error: 'Anfrage zu groß.' });
        }
        const parsed = LobbyGetByCodeSchema.safeParse(data);
        if (!parsed.success) {
          return callback?.({ success: false, error: 'Kein gültiger Lobby-Code angegeben.' });
        }
        try {
          const lobby = manager.findLobbyByCode(parsed.data.code);
          if (!lobby) {
            return callback?.({
              success: false,
              error: 'Lobby wurde nicht gefunden oder ist abgelaufen.',
            });
          }
          callback?.({ success: true, lobby: sanitizeLobbyForClient(lobby) });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 3. Lobby beitreten per ID oder Code
    socket.on(
      SOCKET_EVENTS.LOBBY_JOIN,
      async (
        data: unknown,
        callback?: (res: {
          success: boolean;
          lobby?: any;
          reconnectToken?: string;
          error?: string;
        }) => void
      ) => {
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Sitzung wurde in einem neuen Fenster übernommen.' });
        }
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.LOBBY_JOIN))) {
          return callback?.({ success: false, error: 'Zu viele Anfragen.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.LOBBY_JOIN])) {
          return callback?.({ success: false, error: 'Beitrittsdaten zu groß.' });
        }
        const parsed = LobbyJoinSchema.safeParse(data);
        if (!parsed.success) {
          return callback?.({ success: false, error: 'Ungültige Beitrittsdaten.' });
        }
        try {
          if (socket.data.playerId && parsed.data.userProfile.id !== socket.data.playerId) {
            return callback?.({
              success: false,
              error: 'Ungültige Benutzer-ID für die aktuelle Sitzung.',
            });
          }

          const { lobby, error, reconnectToken, supersededSocketId } = manager.joinLobby({
            lobbyIdOrCode: parsed.data.lobbyIdOrCode,
            userProfile: parsed.data.userProfile as any,
            socketId: socket.id,
            sessionId: socket.data.sessionId,
          });

          if (error || !lobby) {
            return callback?.({ success: false, error: error || 'Beitritt fehlgeschlagen.' });
          }

          if (supersededSocketId) {
            disconnectSupersededSocket(supersededSocketId);
          }

          void upsertPersistentPlayerProfile({
            id: parsed.data.userProfile.id,
            name: parsed.data.userProfile.name,
            avatar: parsed.data.userProfile.avatar,
          });

          const safeLobby = sanitizeLobbyForClient(lobby);
          socket.join(`lobby:${lobby.id}`);
          callback?.({ success: true, lobby: safeLobby, reconnectToken });

          emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.LOBBY_UPDATED, (scopedLobby) => ({
            lobby: scopedLobby,
          }));
          io.emit(SOCKET_EVENTS.LOBBY_LIST_UPDATED, { gameId: lobby.gameId });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 4. Bereit-Status umschalten
    socket.on(
      SOCKET_EVENTS.LOBBY_READY,
      async (
        dataOrCb: unknown,
        maybeCb?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        const { payload, callback } = unpackOptionalPayloadAndCallback(dataOrCb, maybeCb);
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Veraltete Sitzung.' });
        }
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.LOBBY_READY))) {
          return callback?.({ success: false, error: 'Zu viele Aktionen.' });
        }
        if (!isPayloadWithinLimit(payload, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.LOBBY_READY])) {
          return callback?.({ success: false, error: 'Payload zu groß.' });
        }
        const parsed = LobbyReadySchema.safeParse(payload);
        if (!parsed.success) {
          return callback?.({ success: false, error: 'Ungültiges Datenformat.' });
        }
        try {
          const currentLobby = manager.getLobbyBySocket(socket.id);
          const currentPlayer = manager.getPlayerBySocket(socket.id);
          if (!currentLobby || !currentPlayer) {
            return callback?.({ success: false, error: 'Nicht in einer Lobby.' });
          }

          const { lobby, duplicate, error } = manager.toggleReady({
            lobbyId: currentLobby.id,
            playerId: currentPlayer.id,
            actionId: parsed.data.actionId,
            expectedVersion: parsed.data.expectedVersion,
          });
          if (error || !lobby) {
            return callback?.({
              success: false,
              error: error || 'Fehler beim Ändern des Bereit-Status.',
            });
          }

          const safeLobby = sanitizeLobbyForClient(lobby);
          if (!duplicate) {
            emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.LOBBY_UPDATED, (scopedLobby) => ({
              lobby: scopedLobby,
            }));
          }
          callback?.({ success: true, lobby: safeLobby });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 4b. Lobby-Spieleinstellungen aktualisieren (Host)
    socket.on(
      SOCKET_EVENTS.LOBBY_UPDATE_SETTINGS,
      async (
        data: unknown,
        callback?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Veraltete Sitzung.' });
        }
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.LOBBY_UPDATE_SETTINGS))) {
          return callback?.({ success: false, error: 'Zu viele Aktionen.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.LOBBY_UPDATE_SETTINGS])) {
          return callback?.({ success: false, error: 'Einstellungsdaten zu groß.' });
        }
        const parsed = LobbyUpdateSettingsSchema.safeParse(data);
        if (!parsed.success) {
          return callback?.({ success: false, error: 'Ungültige Einstellungen.' });
        }
        try {
          const currentLobby = manager.getLobbyBySocket(socket.id);
          const currentPlayer = manager.getPlayerBySocket(socket.id);
          if (!currentLobby || !currentPlayer) {
            return callback?.({ success: false, error: 'Nicht in einer Lobby.' });
          }

          const { lobby, duplicate, error } = manager.updateSettings({
            lobbyId: currentLobby.id,
            playerId: currentPlayer.id,
            settings: parsed.data.settings,
            actionId: parsed.data.actionId,
            expectedVersion: parsed.data.expectedVersion,
          });
          if (error || !lobby) {
            return callback?.({
              success: false,
              error: error || 'Einstellungen konnten nicht aktualisiert werden.',
            });
          }

          const safeLobby = sanitizeLobbyForClient(lobby);
          if (!duplicate) {
            emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.LOBBY_UPDATED, (scopedLobby) => ({
              lobby: scopedLobby,
            }));
          }
          callback?.({ success: true, lobby: safeLobby });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 4d. Zwischen Standard-Lobby und TV-Lobby wechseln
    socket.on(
      SOCKET_EVENTS.LOBBY_SWITCH_MODE,
      async (
        data: unknown,
        callback?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Veraltete Sitzung.' });
        }
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.LOBBY_SWITCH_MODE))) {
          return callback?.({ success: false, error: 'Zu viele Moduswechsel. Bitte kurz warten.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.LOBBY_SWITCH_MODE])) {
          return callback?.({ success: false, error: 'Anfrage zu groß.' });
        }
        const parsed = LobbySwitchModeSchema.safeParse(data);
        if (!parsed.success) {
          return callback?.({ success: false, error: 'Ungültige Modus-Angabe.' });
        }
        try {
          const currentLobby = manager.getLobbyBySocket(socket.id);
          const currentPlayer = manager.getPlayerBySocket(socket.id);
          if (!currentLobby || !currentPlayer) {
            return callback?.({ success: false, error: 'Nicht in einer Lobby.' });
          }

          const { lobby, duplicate, error } = manager.switchLobbyMode({
            lobbyId: currentLobby.id,
            playerId: currentPlayer.id,
            isTvMode: parsed.data.isTvMode,
            actionId: parsed.data.actionId,
            expectedVersion: parsed.data.expectedVersion,
          });
          if (error || !lobby) {
            return callback?.({
              success: false,
              error: error || 'Modus konnte nicht gewechselt werden.',
            });
          }

          const safeLobby = sanitizeLobbyForClient(lobby);
          if (!duplicate) {
            emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.LOBBY_UPDATED, (scopedLobby) => ({
              lobby: scopedLobby,
            }));
            io.emit(SOCKET_EVENTS.LOBBY_LIST_UPDATED, { gameId: lobby.gameId });
          }
          callback?.({ success: true, lobby: safeLobby });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 4b-2. Spiel in bestehender Lobby wechseln (Host nimmt alle Spieler mit)
    socket.on(
      SOCKET_EVENTS.LOBBY_SWITCH_GAME,
      async (
        data: unknown,
        callback?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Veraltete Sitzung.' });
        }
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.LOBBY_SWITCH_GAME))) {
          return callback?.({ success: false, error: 'Zu viele Spielwechsel. Bitte kurz warten.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.LOBBY_SWITCH_GAME])) {
          return callback?.({ success: false, error: 'Anfrage zu groß.' });
        }
        const parsed = LobbySwitchGameSchema.safeParse(data);
        if (!parsed.success) {
          return callback?.({ success: false, error: 'Ungültige Spiel-ID.' });
        }
        try {
          const currentLobby = manager.getLobbyBySocket(socket.id);
          const currentPlayer = manager.getPlayerBySocket(socket.id);
          if (!currentLobby || !currentPlayer) {
            return callback?.({ success: false, error: 'Nicht in einer Lobby.' });
          }

          const { lobby, duplicate, error } = manager.switchLobbyGame({
            lobbyId: currentLobby.id,
            playerId: currentPlayer.id,
            gameId: parsed.data.gameId,
            actionId: parsed.data.actionId,
            expectedVersion: parsed.data.expectedVersion,
          });
          if (error || !lobby) {
            return callback?.({
              success: false,
              error: error || 'Spiel konnte nicht gewechselt werden.',
            });
          }

          const safeLobby = sanitizeLobbyForClient(lobby);
          if (!duplicate) {
            emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.LOBBY_UPDATED, (scopedLobby) => ({
              lobby: scopedLobby,
            }));
            io.emit(SOCKET_EVENTS.LOBBY_LIST_UPDATED, { gameId: lobby.gameId });
          }
          callback?.({ success: true, lobby: safeLobby });
        } catch (err: any) {
          callback?.({ success: false, error: err?.message || 'Fehler beim Spielwechsel.' });
        }
      }
    );

    // 4c. Spielerprofil live in aktiver Lobby aktualisieren
    socket.on(
      SOCKET_EVENTS.LOBBY_UPDATE_PROFILE,
      async (
        data: unknown,
        callback?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Veraltete Sitzung.' });
        }
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.LOBBY_UPDATE_PROFILE))) {
          return callback?.({ success: false, error: 'Profiländerungen zu schnell.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.LOBBY_UPDATE_PROFILE])) {
          return callback?.({ success: false, error: 'Profilbild oder Name zu groß.' });
        }
        const parsed = LobbyUpdateProfileSchema.safeParse(data);
        if (!parsed.success) {
          return callback?.({ success: false, error: 'Ungültige Profildaten.' });
        }
        try {
          const { lobby, error } = manager.updatePlayerProfile(
            socket.id,
            parsed.data.userProfile as any
          );
          if (!lobby) {
            return callback?.({ success: false, error });
          }
          void upsertPersistentPlayerProfile({
            id: parsed.data.userProfile.id,
            name: parsed.data.userProfile.name,
            avatar: parsed.data.userProfile.avatar,
          });
          const safeLobby = sanitizeLobbyForClient(lobby);
          emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.LOBBY_UPDATED, (scopedLobby) => ({
            lobby: scopedLobby,
          }));
          callback?.({ success: true, lobby: safeLobby });
        } catch {
          callback?.({ success: false });
        }
      }
    );

    // 5. Spiel durch Host starten
    socket.on(
      SOCKET_EVENTS.LOBBY_START,
      async (
        dataOrCb: unknown,
        maybeCb?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        const { payload, callback } = unpackOptionalPayloadAndCallback(dataOrCb, maybeCb);
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Veraltete Sitzung.' });
        }
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.LOBBY_START))) {
          return callback?.({ success: false, error: 'Zu viele Aktionen.' });
        }
        if (!isPayloadWithinLimit(payload, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.LOBBY_START])) {
          return callback?.({ success: false, error: 'Payload zu groß.' });
        }
        const parsed = LobbyStartSchema.safeParse(payload);
        if (!parsed.success) {
          return callback?.({ success: false, error: 'Ungültiges Datenformat.' });
        }
        try {
          const currentLobby = manager.getLobbyBySocket(socket.id);
          const currentPlayer = manager.getPlayerBySocket(socket.id);
          if (!currentLobby || !currentPlayer) {
            return callback?.({ success: false, error: 'Nicht in einer Lobby.' });
          }

          const { lobby, duplicate, error } = manager.startGame({
            lobbyId: currentLobby.id,
            playerId: currentPlayer.id,
            actionId: parsed.data.actionId,
            expectedVersion: parsed.data.expectedVersion,
          });
          if (error || !lobby) {
            return callback?.({
              success: false,
              error: error || 'Spiel konnte nicht gestartet werden.',
            });
          }

          const safeLobby = sanitizeLobbyForClient(lobby, currentPlayer.id);
          if (!duplicate) {
            emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.GAME_STARTED, (scopedLobby) => ({
              lobby: scopedLobby,
            }));
            syncLobbyAutomations(lobby);
            io.emit(SOCKET_EVENTS.LOBBY_LIST_UPDATED, { gameId: lobby.gameId });
          }
          callback?.({ success: true, lobby: safeLobby });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 6. Spielzug ausführen
    socket.on(
      SOCKET_EVENTS.GAME_MOVE,
      async (
        moveData: unknown,
        callback?: (res: {
          success: boolean;
          error?: string;
          gameState?: any;
          lobby?: any;
        }) => void
      ) => {
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Sitzung wurde durch neueres Fenster abgelöst.' });
        }
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.GAME_MOVE))) {
          return callback?.({ success: false, error: 'Zu schnell! Bitte einen Moment warten.' });
        }
        if (!isPayloadWithinLimit(moveData, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.GAME_MOVE])) {
          return callback?.({ success: false, error: 'Spielzug-Payload zu groß.' });
        }
        const parsed = GameMoveSchema.safeParse(moveData);
        if (!parsed.success) {
          return callback?.({ success: false, error: 'Ungültiges Zug-Format.' });
        }
        try {
          const currentLobby = manager.getLobbyBySocket(socket.id);
          const currentPlayer = manager.getPlayerBySocket(socket.id);
          if (!currentLobby || !currentPlayer) {
            return callback?.({ success: false, error: 'Kein aktives Spiel gefunden.' });
          }

          const { actionId, expectedVersion, ...move } = parsed.data;
          const { lobby, duplicate, error } = manager.makeMove({
            lobbyId: currentLobby.id,
            playerId: currentPlayer.id,
            move,
            actionId,
            expectedVersion,
          });
          if (error || !lobby) {
            return callback?.({ success: false, error: error || 'Ungültiger Zug.' });
          }

          const safeLobby = sanitizeLobbyForClient(lobby, currentPlayer.id);
          if (!duplicate) {
            emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.GAME_STATE, (scopedLobby) => ({
              gameState: scopedLobby.gameState,
              status: scopedLobby.status,
              lobby: scopedLobby,
            }));
            syncLobbyAutomations(lobby);
          }

          callback?.({ success: true, gameState: safeLobby.gameState, lobby: safeLobby });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 6b. Live-Drawing für Zeichnen & Raten
    socket.on(SOCKET_EVENTS.DRAW_STROKES, async (data: unknown) => {
      try {
        if (socket.data.superseded) return;
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.DRAW_STROKES))) return;
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.DRAW_STROKES])) return;

        const parsed = DrawStrokesSchema.safeParse(data);
        if (!parsed.success) return;

        const lobby = manager.getLobbyBySocket(socket.id);
        if (!lobby || !lobby.gameState || lobby.status !== 'in_progress') return;
        if (lobby.gameId !== 'draw-and-guess') return;
        if ((lobby.gameState as any).roundStatus !== 'drawing') return;

        const player = lobby.players.find((p) => p.socketId === socket.id);
        if (
          !player ||
          !player.connected ||
          player.connectionState !== 'connected' ||
          player.id !== (lobby.gameState as any).currentDrawerId
        ) {
          return;
        }

        const sanitized = parsed.data.strokes;
        const currentStrokes = (lobby.gameState as any).strokes || [];
        (lobby.gameState as any).strokes = [...currentStrokes, ...sanitized].slice(-3000);

        socket.to(`lobby:${lobby.id}`).emit(SOCKET_EVENTS.DRAW_LIVE_STROKES, {
          strokes: sanitized,
        });
      } catch (err) {
        console.error('Fehler bei draw:strokes:', err);
      }
    });

    socket.on(SOCKET_EVENTS.DRAW_CLEAR, async () => {
      try {
        if (socket.data.superseded) return;
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.DRAW_CLEAR))) return;

        const lobby = manager.getLobbyBySocket(socket.id);
        if (!lobby || !lobby.gameState || lobby.status !== 'in_progress') return;
        if (lobby.gameId !== 'draw-and-guess') return;
        if ((lobby.gameState as any).roundStatus !== 'drawing') return;

        const player = lobby.players.find((p) => p.socketId === socket.id);
        if (
          !player ||
          !player.connected ||
          player.id !== (lobby.gameState as any).currentDrawerId
        ) {
          return;
        }

        (lobby.gameState as any).strokes = [];
        socket.to(`lobby:${lobby.id}`).emit(SOCKET_EVENTS.DRAW_LIVE_CLEAR);
      } catch (err) {
        console.error('Fehler bei draw:clear:', err);
      }
    });

    socket.on(SOCKET_EVENTS.DRAW_UNDO, async () => {
      try {
        if (socket.data.superseded) return;
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.DRAW_UNDO))) return;

        const lobby = manager.getLobbyBySocket(socket.id);
        if (!lobby || !lobby.gameState || lobby.status !== 'in_progress') return;
        if (lobby.gameId !== 'draw-and-guess') return;
        if ((lobby.gameState as any).roundStatus !== 'drawing') return;

        const player = lobby.players.find((p) => p.socketId === socket.id);
        if (
          !player ||
          !player.connected ||
          player.id !== (lobby.gameState as any).currentDrawerId
        ) {
          return;
        }

        const currentStrokes: any[] = (lobby.gameState as any).strokes || [];
        if (currentStrokes.length === 0) return;

        const lastSegment = currentStrokes[currentStrokes.length - 1];
        let newStrokes: any[] = [];
        if (lastSegment && lastSegment.strokeId !== undefined) {
          const targetId = lastSegment.strokeId;
          newStrokes = currentStrokes.filter((s) => s.strokeId !== targetId);
        } else {
          newStrokes = currentStrokes.slice(0, -1);
        }

        (lobby.gameState as any).strokes = newStrokes;
        socket.to(`lobby:${lobby.id}`).emit(SOCKET_EVENTS.DRAW_LIVE_UNDO, {
          strokes: newStrokes,
        });
      } catch (err) {
        console.error('Fehler bei draw:undo:', err);
      }
    });

    // 6c. Live-Controller & HUD-Sync für Zombie Arena 3D
    socket.on(SOCKET_EVENTS.ZOMBIE_INPUT, async (data: unknown) => {
      try {
        if (socket.data.superseded) return;
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.ZOMBIE_INPUT))) return;
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.ZOMBIE_INPUT])) return;

        const parsed = ZombieInputSchema.safeParse(data);
        if (!parsed.success) return;

        const lobby = manager.getLobbyBySocket(socket.id);
        if (!lobby || !lobby.gameState || lobby.status !== 'in_progress') return;
        if (lobby.gameId !== 'zombie-survival') return;

        const player = lobby.players.find((p) => p.socketId === socket.id);
        if (!player || !player.connected || player.isTvScreen) return;

        socket.to(`lobby:${lobby.id}`).emit(SOCKET_EVENTS.ZOMBIE_INPUT, {
          playerId: player.id,
          input: parsed.data,
        });
      } catch (err) {
        console.error('Fehler bei zombie:input:', err);
      }
    });

    socket.on(SOCKET_EVENTS.ZOMBIE_STATE, async (data: unknown) => {
      try {
        if (socket.data.superseded) return;
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.ZOMBIE_STATE))) return;
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.ZOMBIE_STATE])) return;

        const parsed = ZombieStateSchema.safeParse(data);
        if (!parsed.success) return;

        const lobby = manager.getLobbyBySocket(socket.id);
        if (!lobby || !lobby.gameState || lobby.status !== 'in_progress') return;
        if (lobby.gameId !== 'zombie-survival') return;

        const sender = lobby.players.find((p) => p.socketId === socket.id);
        if (!sender || (!sender.isTvScreen && !sender.isHost)) return;

        socket.to(`lobby:${lobby.id}`).emit(SOCKET_EVENTS.ZOMBIE_STATE, parsed.data);
      } catch (err) {
        console.error('Fehler bei zombie:state:', err);
      }
    });

    socket.on(SOCKET_EVENTS.GOLDMINER_INPUT, async (data: unknown) => {
      try {
        if (socket.data.superseded) return;
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.GOLDMINER_INPUT))) return;
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.GOLDMINER_INPUT])) return;

        const parsed = GoldMinerInputSchema.safeParse(data);
        if (!parsed.success) return;

        const lobby = manager.getLobbyBySocket(socket.id);
        if (!lobby || !lobby.gameState || lobby.status !== 'in_progress') return;
        if (lobby.gameId !== 'gold-miner') return;

        const player = lobby.players.find((p) => p.socketId === socket.id);
        if (!player || !player.connected || player.isTvScreen) return;

        socket.to(`lobby:${lobby.id}`).emit(SOCKET_EVENTS.GOLDMINER_INPUT, {
          playerId: player.id,
          input: parsed.data,
        });
      } catch (err) {
        console.error('Fehler bei goldminer:input:', err);
      }
    });

    socket.on(SOCKET_EVENTS.GOLDMINER_STATE, async (data: unknown) => {
      try {
        if (socket.data.superseded) return;
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.GOLDMINER_STATE))) return;
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.GOLDMINER_STATE])) return;

        const parsed = GoldMinerStateSchema.safeParse(data);
        if (!parsed.success) return;

        const lobby = manager.getLobbyBySocket(socket.id);
        if (!lobby || !lobby.gameState || lobby.status !== 'in_progress') return;
        if (lobby.gameId !== 'gold-miner') return;

        const sender = lobby.players.find((p) => p.socketId === socket.id);
        if (!sender || (!sender.isTvScreen && !sender.isHost)) return;

        socket.to(`lobby:${lobby.id}`).emit(SOCKET_EVENTS.GOLDMINER_STATE, parsed.data);
      } catch (err) {
        console.error('Fehler bei goldminer:state:', err);
      }
    });

    // 7. Revanche / Nochmal spielen
    socket.on(
      SOCKET_EVENTS.GAME_REMATCH,
      async (
        dataOrCb: unknown,
        maybeCb?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        const { payload, callback } = unpackOptionalPayloadAndCallback(dataOrCb, maybeCb);
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Veraltete Sitzung.' });
        }
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.GAME_REMATCH))) {
          return callback?.({ success: false, error: 'Zu viele Aktionen.' });
        }
        if (!isPayloadWithinLimit(payload, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.GAME_REMATCH])) {
          return callback?.({ success: false, error: 'Payload zu groß.' });
        }
        const parsed = GameRematchSchema.safeParse(payload);
        if (!parsed.success) {
          return callback?.({ success: false, error: 'Ungültige Anfrage.' });
        }
        try {
          const currentLobby = manager.getLobbyBySocket(socket.id);
          const currentPlayer = manager.getPlayerBySocket(socket.id);
          if (!currentLobby || !currentPlayer) {
            return callback?.({ success: false, error: 'Nicht in einer Lobby.' });
          }

          const { lobby, restarted, duplicate, error } = manager.requestRematch({
            lobbyId: currentLobby.id,
            playerId: currentPlayer.id,
            actionId: parsed.data.actionId,
            expectedVersion: parsed.data.expectedVersion,
          });
          if (error || !lobby) {
            return callback?.({ success: false, error: error || 'Revanche nicht möglich.' });
          }

          const safeLobby = sanitizeLobbyForClient(lobby, currentPlayer.id);
          if (!duplicate) {
            if (restarted) {
              emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.GAME_RESTARTED, (scopedLobby) => ({
                lobby: scopedLobby,
              }));
              syncLobbyAutomations(lobby);
            } else {
              emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.LOBBY_UPDATED, (scopedLobby) => ({
                lobby: scopedLobby,
              }));
            }
          }

          callback?.({ success: true, lobby: safeLobby });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 8. Lobby explizit verlassen
    socket.on(SOCKET_EVENTS.LOBBY_LEAVE, async (callback?: (res: { success: boolean }) => void) => {
      if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.LOBBY_LEAVE))) {
        return callback?.({ success: false });
      }
      try {
        const { lobbyId, lobby, wasHost, deleted, newHost, previousHostId } =
          manager.leaveCurrentLobby(socket.id, socket.data.playerId);
        if (lobbyId) {
          socket.leave(`lobby:${lobbyId}`);
          if (deleted) {
            clearLobbyAutomations(lobbyId);
            io.emit(SOCKET_EVENTS.LOBBY_LIST_UPDATED, {});
          } else if (lobby) {
            if (newHost && previousHostId) {
              emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.LOBBY_HOST_CHANGED, (scopedLobby) => ({
                lobby: scopedLobby,
                newHostId: newHost.id,
                newHostName: newHost.name,
                previousHostId,
                reason: 'host_left',
              }));
            }
            emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.LOBBY_UPDATED, (scopedLobby) => ({
              lobby: scopedLobby,
              message: wasHost
                ? 'Neuer Host gewählt.'
                : 'Ein Spieler hat die Lobby verlassen.',
            }));
            syncLobbyAutomations(lobby);
            io.emit(SOCKET_EVENTS.LOBBY_LIST_UPDATED, { gameId: lobby.gameId });
          }
        }
        callback?.({ success: true });
      } catch {
        callback?.({ success: false });
      }
    });

    // 9. Sicheres Wiederverbinden nach Disconnect / Reload / Tab-Wechsel
    socket.on(
      SOCKET_EVENTS.LOBBY_RECONNECT,
      async (
        data: unknown,
        callback?: (res: {
          success: boolean;
          lobby?: any;
          reconnectToken?: string;
          error?: string;
        }) => void
      ) => {
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Sitzung wurde abgelöst.' });
        }
        if (!(await consumeRateLimit(socket.id, SOCKET_EVENTS.LOBBY_RECONNECT))) {
          return callback?.({ success: false, error: 'Zu viele Reconnect-Versuche.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES[SOCKET_EVENTS.LOBBY_RECONNECT])) {
          return callback?.({ success: false, error: 'Anfrage zu groß.' });
        }
        const parsed = LobbyReconnectSchema.safeParse(data ?? {});
        if (!parsed.success) {
          return callback?.({ success: false, error: 'Ungültige Reconnect-Daten.' });
        }
        try {
          const { success, lobby, reconnectToken, supersededSocketId, error } =
            manager.reconnectPlayer({
              userId: parsed.data.userId || socket.data.playerId,
              sessionId: socket.data.sessionId,
              reconnectToken: parsed.data.reconnectToken,
              lobbyIdOrCode: parsed.data.lobbyIdOrCode,
              socketId: socket.id,
            });

          if (!success || !lobby) {
            return callback?.({
              success: false,
              error: error || 'Wiederverbindung fehlgeschlagen.',
            });
          }

          if (supersededSocketId) {
            disconnectSupersededSocket(supersededSocketId);
          }

          const viewerId = parsed.data.userId || socket.data.playerId;
          const safeLobby = sanitizeLobbyForClient(lobby, viewerId);
          socket.join(`lobby:${lobby.id}`);
          syncLobbyAutomations(lobby);
          emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.LOBBY_UPDATED, (scopedLobby) => ({
            lobby: scopedLobby,
            message: 'Spieler ist wieder verbunden!',
          }));
          return callback?.({ success: true, lobby: safeLobby, reconnectToken });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 10. Verbindungsabbruch
    socket.on('disconnect', () => {
      cleanupSocketRateLimit(socket.id);
      if (socket.data.superseded) {
        return;
      }
      const { lobbyId, lobby, player, ignoredStaleSocket } = manager.handleDisconnect(socket.id);
      if (ignoredStaleSocket) {
        return;
      }
      if (lobbyId && lobby && player) {
        emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.LOBBY_PLAYER_DISCONNECTED, (scopedLobby) => ({
          playerId: player.id,
          playerName: player.name,
          reconnectDeadline: player.reconnectDeadline,
          lobby: scopedLobby,
        }));
        emitLobbyEventPerViewer(lobby, SOCKET_EVENTS.LOBBY_UPDATED, (scopedLobby) => ({
          lobby: scopedLobby,
          message: `${player.name} hat die Verbindung verloren.`,
        }));
      }
    });
  });

  // Verhindert hängende Timer beim Test-Shutdown
  io.httpServer?.once('close', () => {
    phaseScheduler.clearAll();
  });
}
