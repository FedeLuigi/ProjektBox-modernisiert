import { Server as SocketIOServer, Socket } from 'socket.io';
import { LobbyManager, lobbyManager, sanitizeLobbyForClient } from './lobbyManager.js';
import type { Lobby } from '../types/multiplayer.js';
import {
  parseCookieHeader,
  SESSION_COOKIE_NAME,
} from '../session/sessionManager.js';
import { cleanupSocketRateLimit, consumeRateLimit } from '../utils/rateLimiter.js';
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
  LobbyStartSchema,
  LobbySwitchModeSchema,
  LobbyUpdateProfileSchema,
  LobbyUpdateSettingsSchema,
  SessionPingSchema,
} from './socketSchemas.js';

function unpackOptionalPayloadAndCallback<TRes>(
  dataOrCallback: unknown,
  maybeCallback?: (res: TRes) => void
): { payload: unknown; callback?: (res: TRes) => void } {
  if (typeof dataOrCallback === 'function') {
    return { payload: {}, callback: dataOrCallback as (res: TRes) => void };
  }
  return { payload: dataOrCallback ?? {}, callback: maybeCallback };
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

  manager.setCallbacks({
    onPlayerExpired(lobby, player) {
      emitLobbyEventPerViewer(lobby, 'lobby:player-offline', (scopedLobby) => ({
        playerId: player.id,
        playerName: player.name,
        lobby: scopedLobby,
      }));
      emitLobbyEventPerViewer(lobby, 'lobby:updated', (scopedLobby) => ({
        lobby: scopedLobby,
        message: `${player.name} hat die Wiederverbindungsfrist überschritten.`,
      }));
      if (player.socketId) {
        const oldSock = io.sockets.sockets.get(player.socketId);
        oldSock?.emit('session:expired', {
          reason: 'reconnect_timeout',
          message: 'Deine Wiederverbindungsfrist (60s) ist abgelaufen.',
        });
      }
      io.emit('lobby:list-updated', { gameId: lobby.gameId });
    },
    onHostChanged(lobby, newHost, previousHostId, reason) {
      emitLobbyEventPerViewer(lobby, 'lobby:host-changed', (scopedLobby) => ({
        lobby: scopedLobby,
        newHostId: newHost.id,
        newHostName: newHost.name,
        previousHostId,
        reason,
      }));
      emitLobbyEventPerViewer(lobby, 'lobby:updated', (scopedLobby) => ({
        lobby: scopedLobby,
        message: `${newHost.name} ist jetzt der neue Host.`,
      }));
    },
    onLobbyUpdated(lobby) {
      emitLobbyEventPerViewer(lobby, 'lobby:updated', (scopedLobby) => ({
        lobby: scopedLobby,
      }));
    },
    onLobbyExpired(lobby) {
      io.to(`lobby:${lobby.id}`).emit('lobby:expired', {
        lobbyId: lobby.id,
        code: lobby.code,
      });
      io.emit('lobby:list-updated', { gameId: lobby.gameId });
    },
  });

  // Authentifizierungs-Middleware über HttpOnly-Session-Cookie
  io.use((socket, next) => {
    const cookies = parseCookieHeader(socket.handshake.headers.cookie);
    const rawCookie = cookies[SESSION_COOKIE_NAME];
    if (rawCookie) {
      const check = manager.sessionManager.verifySessionToken(rawCookie);
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
      socket.emit('session:expired', {
        reason: socket.data.sessionExpiredReason,
        message: 'Deine Sitzung ist abgelaufen oder wurde beendet.',
      });
    }

    // Bei Socket.io Connection State Recovery direkt autoritativen Zustand aus dem Manager synchronisieren
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
          socket.emit('lobby:state-sync', {
            lobby: safeLobby,
            reconnectToken: recon.reconnectToken,
          });
          emitLobbyEventPerViewer(recon.lobby, 'lobby:updated', (scopedLobby) => ({
            lobby: scopedLobby,
          }));
        }
      }
    }

    // 0. Anwendungs-Heartbeat (ergänzend zu Engine.io Ping/Pong)
    socket.on(
      'session:ping',
      async (
        data: unknown,
        callback?: (res: { serverTime: number; clientTime?: number; sessionValid: boolean }) => void
      ) => {
        if (!(await consumeRateLimit(socket.id, 'session:ping'))) return;
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES['session:ping'])) return;
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
        socket.emit('session:pong', res);
      }
    );

    // 1. Liste offener Lobbys abrufen
    socket.on(
      'lobby:list',
      async (
        data: unknown,
        callback?: (res: { success: boolean; lobbies?: any[]; error?: string }) => void
      ) => {
        if (!(await consumeRateLimit(socket.id, 'lobby:list'))) {
          return callback?.({ success: false, error: 'Zu viele Anfragen. Bitte kurz warten.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES['lobby:list'])) {
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
      'lobby:create',
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
        if (!(await consumeRateLimit(socket.id, 'lobby:create'))) {
          return callback?.({ success: false, error: 'Zu viele Anfragen. Bitte kurz warten.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES['lobby:create'])) {
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

          const safeLobby = sanitizeLobbyForClient(lobby);
          socket.join(`lobby:${lobby.id}`);
          callback?.({ success: true, lobby: safeLobby, reconnectToken });
          io.emit('lobby:list-updated', { gameId: lobby.gameId });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 2b. Lobby per Code prüfen
    socket.on(
      'lobby:getByCode',
      async (
        data: unknown,
        callback?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        if (!(await consumeRateLimit(socket.id, 'lobby:getByCode'))) {
          return callback?.({ success: false, error: 'Zu viele Code-Abfragen. Bitte kurz warten.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES['lobby:getByCode'])) {
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
      'lobby:join',
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
        if (!(await consumeRateLimit(socket.id, 'lobby:join'))) {
          return callback?.({ success: false, error: 'Zu viele Anfragen.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES['lobby:join'])) {
          return callback?.({ success: false, error: 'Beitrittsdaten zu groß.' });
        }
        const parsed = LobbyJoinSchema.safeParse(data);
        if (!parsed.success) {
          return callback?.({ success: false, error: 'Ungültige Beitrittsdaten.' });
        }
        try {
          // Serverseitige Session verhindert User-ID-Fälschung
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

          const safeLobby = sanitizeLobbyForClient(lobby);
          socket.join(`lobby:${lobby.id}`);
          callback?.({ success: true, lobby: safeLobby, reconnectToken });

          io.to(`lobby:${lobby.id}`).emit('lobby:updated', { lobby: safeLobby });
          io.emit('lobby:list-updated', { gameId: lobby.gameId });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 4. Bereit-Status umschalten
    socket.on(
      'lobby:ready',
      async (
        dataOrCb: unknown,
        maybeCb?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        const { payload, callback } = unpackOptionalPayloadAndCallback(dataOrCb, maybeCb);
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Veraltete Sitzung.' });
        }
        if (!(await consumeRateLimit(socket.id, 'lobby:ready'))) {
          return callback?.({ success: false, error: 'Zu viele Aktionen.' });
        }
        if (!isPayloadWithinLimit(payload, EVENT_MAX_PAYLOAD_BYTES['lobby:ready'])) {
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
            io.to(`lobby:${lobby.id}`).emit('lobby:updated', { lobby: safeLobby });
          }
          callback?.({ success: true, lobby: safeLobby });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 4b. Lobby-Spieleinstellungen aktualisieren (Host)
    socket.on(
      'lobby:update-settings',
      async (
        data: unknown,
        callback?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Veraltete Sitzung.' });
        }
        if (!(await consumeRateLimit(socket.id, 'lobby:update-settings'))) {
          return callback?.({ success: false, error: 'Zu viele Aktionen.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES['lobby:update-settings'])) {
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
            io.to(`lobby:${lobby.id}`).emit('lobby:updated', { lobby: safeLobby });
          }
          callback?.({ success: true, lobby: safeLobby });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 4d. Zwischen Standard-Lobby und TV-Lobby wechseln (ohne Lobby-Neuerstellung)
    socket.on(
      'lobby:switch-mode',
      async (
        data: unknown,
        callback?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Veraltete Sitzung.' });
        }
        if (!(await consumeRateLimit(socket.id, 'lobby:switch-mode'))) {
          return callback?.({ success: false, error: 'Zu viele Moduswechsel. Bitte kurz warten.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES['lobby:switch-mode'])) {
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
            io.to(`lobby:${lobby.id}`).emit('lobby:updated', { lobby: safeLobby });
            io.emit('lobby:list-updated', { gameId: lobby.gameId });
          }
          callback?.({ success: true, lobby: safeLobby });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 4c. Spielerprofil live in aktiver Lobby aktualisieren
    socket.on(
      'lobby:update-profile',
      async (
        data: unknown,
        callback?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Veraltete Sitzung.' });
        }
        if (!(await consumeRateLimit(socket.id, 'lobby:update-profile'))) {
          return callback?.({ success: false, error: 'Profiländerungen zu schnell.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES['lobby:update-profile'])) {
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
          const safeLobby = sanitizeLobbyForClient(lobby);
          io.to(`lobby:${lobby.id}`).emit('lobby:updated', { lobby: safeLobby });
          callback?.({ success: true, lobby: safeLobby });
        } catch {
          callback?.({ success: false });
        }
      }
    );

    // 5. Spiel durch Host starten
    socket.on(
      'lobby:start',
      async (
        dataOrCb: unknown,
        maybeCb?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        const { payload, callback } = unpackOptionalPayloadAndCallback(dataOrCb, maybeCb);
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Veraltete Sitzung.' });
        }
        if (!(await consumeRateLimit(socket.id, 'lobby:start'))) {
          return callback?.({ success: false, error: 'Zu viele Aktionen.' });
        }
        if (!isPayloadWithinLimit(payload, EVENT_MAX_PAYLOAD_BYTES['lobby:start'])) {
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
            emitLobbyEventPerViewer(lobby, 'game:started', (scopedLobby) => ({
              lobby: scopedLobby,
            }));
            io.emit('lobby:list-updated', { gameId: lobby.gameId });
          }
          callback?.({ success: true, lobby: safeLobby });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 6. Spielzug ausführen
    socket.on(
      'game:move',
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
        if (!(await consumeRateLimit(socket.id, 'game:move'))) {
          return callback?.({ success: false, error: 'Zu schnell! Bitte einen Moment warten.' });
        }
        if (!isPayloadWithinLimit(moveData, EVENT_MAX_PAYLOAD_BYTES['game:move'])) {
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
            emitLobbyEventPerViewer(lobby, 'game:state', (scopedLobby) => ({
              gameState: scopedLobby.gameState,
              status: scopedLobby.status,
              lobby: scopedLobby,
            }));
          }

          callback?.({ success: true, gameState: safeLobby.gameState, lobby: safeLobby });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 6b. Live-Drawing für Zeichnen & Raten
    socket.on('draw:strokes', async (data: unknown) => {
      try {
        if (socket.data.superseded) return;
        if (!(await consumeRateLimit(socket.id, 'draw:strokes'))) return;
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES['draw:strokes'])) return;

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

        socket.to(`lobby:${lobby.id}`).emit('draw:live-strokes', {
          strokes: sanitized,
        });
      } catch (err) {
        console.error('Fehler bei draw:strokes:', err);
      }
    });

    socket.on('draw:clear', async () => {
      try {
        if (socket.data.superseded) return;
        if (!(await consumeRateLimit(socket.id, 'draw:clear'))) return;

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
        socket.to(`lobby:${lobby.id}`).emit('draw:live-clear');
      } catch (err) {
        console.error('Fehler bei draw:clear:', err);
      }
    });

    socket.on('draw:undo', async () => {
      try {
        if (socket.data.superseded) return;
        if (!(await consumeRateLimit(socket.id, 'draw:undo'))) return;

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
        socket.to(`lobby:${lobby.id}`).emit('draw:live-undo', {
          strokes: newStrokes,
        });
      } catch (err) {
        console.error('Fehler bei draw:undo:', err);
      }
    });

    // 7. Revanche / Nochmal spielen
    socket.on(
      'game:rematch',
      async (
        dataOrCb: unknown,
        maybeCb?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        const { payload, callback } = unpackOptionalPayloadAndCallback(dataOrCb, maybeCb);
        if (socket.data.superseded) {
          return callback?.({ success: false, error: 'Veraltete Sitzung.' });
        }
        if (!(await consumeRateLimit(socket.id, 'game:rematch'))) {
          return callback?.({ success: false, error: 'Zu viele Aktionen.' });
        }
        if (!isPayloadWithinLimit(payload, EVENT_MAX_PAYLOAD_BYTES['game:rematch'])) {
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
              emitLobbyEventPerViewer(lobby, 'game:restarted', (scopedLobby) => ({
                lobby: scopedLobby,
              }));
            } else {
              emitLobbyEventPerViewer(lobby, 'lobby:updated', (scopedLobby) => ({
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
    socket.on('lobby:leave', async (callback?: (res: { success: boolean }) => void) => {
      if (!(await consumeRateLimit(socket.id, 'lobby:leave'))) {
        return callback?.({ success: false });
      }
      try {
        const { lobbyId, lobby, wasHost, deleted, newHost, previousHostId } =
          manager.leaveCurrentLobby(socket.id, socket.data.playerId);
        if (lobbyId) {
          socket.leave(`lobby:${lobbyId}`);
          if (deleted) {
            io.emit('lobby:list-updated', {});
          } else if (lobby) {
            if (newHost && previousHostId) {
              emitLobbyEventPerViewer(lobby, 'lobby:host-changed', (scopedLobby) => ({
                lobby: scopedLobby,
                newHostId: newHost.id,
                newHostName: newHost.name,
                previousHostId,
                reason: 'host_left',
              }));
            }
            emitLobbyEventPerViewer(lobby, 'lobby:updated', (scopedLobby) => ({
              lobby: scopedLobby,
              message: wasHost
                ? 'Neuer Host gewählt.'
                : 'Ein Spieler hat die Lobby verlassen.',
            }));
            io.emit('lobby:list-updated', { gameId: lobby.gameId });
          }
        }
        callback?.({ success: true });
      } catch {
        callback?.({ success: false });
      }
    });

    // 9. Sicheres Wiederverbinden nach Disconnect / Reload / Tab-Wechsel
    socket.on(
      'lobby:reconnect',
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
        if (!(await consumeRateLimit(socket.id, 'lobby:reconnect'))) {
          return callback?.({ success: false, error: 'Zu viele Reconnect-Versuche.' });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES['lobby:reconnect'])) {
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
          emitLobbyEventPerViewer(lobby, 'lobby:updated', (scopedLobby) => ({
            lobby: scopedLobby,
            message: 'Spieler ist wieder verbunden!',
          }));
          return callback?.({ success: true, lobby: safeLobby, reconnectToken });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 10. Verbindungsabbruch (Temporäre Trennung mit Reconnect-Frist)
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
        emitLobbyEventPerViewer(lobby, 'lobby:player-disconnected', (scopedLobby) => ({
          playerId: player.id,
          playerName: player.name,
          reconnectDeadline: player.reconnectDeadline,
          lobby: scopedLobby,
        }));
        emitLobbyEventPerViewer(lobby, 'lobby:updated', (scopedLobby) => ({
          lobby: scopedLobby,
          message: `${player.name} hat die Verbindung verloren.`,
        }));
      }
    });
  });
}
