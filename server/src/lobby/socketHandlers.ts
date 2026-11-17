import { Server as SocketIOServer, Socket } from 'socket.io';
import { lobbyManager } from './lobbyManager.js';
import { cleanupSocketRateLimit, consumeRateLimit } from '../utils/rateLimiter.js';
import {
  DrawStrokesSchema,
  EVENT_MAX_PAYLOAD_BYTES,
  GameMoveSchema,
  isPayloadWithinLimit,
  LobbyCreateSchema,
  LobbyGetByCodeSchema,
  LobbyJoinSchema,
  LobbyListSchema,
  LobbyReconnectSchema,
  LobbyUpdateProfileSchema,
  LobbyUpdateSettingsSchema,
} from './socketSchemas.js';

export function registerSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    // 1. Liste offener Lobbys für ein beliebiges Spiel abrufen
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
          const list = lobbyManager.getPublicLobbies(parsed.data.gameId);
          callback?.({ success: true, lobbies: list });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 2. Lobby erstellen (generisch für alle Spiele, inkl. TV-Modus)
    socket.on(
      'lobby:create',
      async (
        data: unknown,
        callback?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
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
          const { lobby, error } = lobbyManager.createLobby({
            name: parsed.data.name,
            isPrivate: parsed.data.isPrivate,
            gameId: parsed.data.gameId,
            userProfile: parsed.data.userProfile as any,
            socketId: socket.id,
            isTvMode: parsed.data.isTvMode,
          });

          if (error || !lobby) {
            return callback?.({
              success: false,
              error: error || 'Lobby konnte nicht erstellt werden.',
            });
          }

          socket.join(`lobby:${lobby.id}`);
          callback?.({ success: true, lobby });
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
          const lobby = lobbyManager.findLobbyByCode(parsed.data.code);
          if (!lobby) {
            return callback?.({
              success: false,
              error: 'Lobby wurde nicht gefunden oder ist abgelaufen.',
            });
          }
          callback?.({ success: true, lobby });
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
        callback?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
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
          const { lobby, error } = lobbyManager.joinLobby({
            lobbyIdOrCode: parsed.data.lobbyIdOrCode,
            userProfile: parsed.data.userProfile as any,
            socketId: socket.id,
          });

          if (error || !lobby) {
            return callback?.({ success: false, error: error || 'Beitritt fehlgeschlagen.' });
          }

          socket.join(`lobby:${lobby.id}`);
          callback?.({ success: true, lobby });

          io.to(`lobby:${lobby.id}`).emit('lobby:updated', { lobby });
          io.emit('lobby:list-updated', { gameId: lobby.gameId });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 4. Bereit-Status umschalten
    socket.on(
      'lobby:ready',
      async (callback?: (res: { success: boolean; lobby?: any; error?: string }) => void) => {
        if (!(await consumeRateLimit(socket.id, 'lobby:ready'))) {
          return callback?.({ success: false, error: 'Zu viele Aktionen.' });
        }
        try {
          const { lobby, error } = lobbyManager.toggleReady(socket.id);
          if (error || !lobby) {
            return callback?.({
              success: false,
              error: error || 'Fehler beim Ändern des Bereit-Status.',
            });
          }

          io.to(`lobby:${lobby.id}`).emit('lobby:updated', { lobby });
          callback?.({ success: true, lobby });
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
          const { lobby, error } = lobbyManager.updateSettings(socket.id, parsed.data.settings);
          if (error || !lobby) {
            return callback?.({
              success: false,
              error: error || 'Einstellungen konnten nicht aktualisiert werden.',
            });
          }

          io.to(`lobby:${lobby.id}`).emit('lobby:updated', { lobby });
          callback?.({ success: true, lobby });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 4c. Spielerprofil (Name & Avatar) live in aktiver Lobby aktualisieren
    socket.on(
      'lobby:update-profile',
      async (
        data: unknown,
        callback?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
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
          const { lobby } = lobbyManager.updatePlayerProfile(
            socket.id,
            parsed.data.userProfile as any
          );
          if (!lobby) {
            return callback?.({ success: false });
          }
          io.to(`lobby:${lobby.id}`).emit('lobby:updated', { lobby });
          callback?.({ success: true, lobby });
        } catch {
          callback?.({ success: false });
        }
      }
    );

    // 5. Spiel durch Host starten
    socket.on(
      'lobby:start',
      async (callback?: (res: { success: boolean; lobby?: any; error?: string }) => void) => {
        if (!(await consumeRateLimit(socket.id, 'lobby:start'))) {
          return callback?.({ success: false, error: 'Zu viele Aktionen.' });
        }
        try {
          const { lobby, error } = lobbyManager.startGame(socket.id);
          if (error || !lobby) {
            return callback?.({
              success: false,
              error: error || 'Spiel konnte nicht gestartet werden.',
            });
          }

          io.to(`lobby:${lobby.id}`).emit('game:started', { lobby });
          io.emit('lobby:list-updated', { gameId: lobby.gameId });
          callback?.({ success: true, lobby });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 6. Spielzug ausführen (generisch)
    socket.on(
      'game:move',
      async (
        moveData: unknown,
        callback?: (res: { success: boolean; error?: string; gameState?: any }) => void
      ) => {
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
          const { lobby, error } = lobbyManager.makeMove(socket.id, parsed.data);
          if (error || !lobby) {
            return callback?.({ success: false, error: error || 'Ungültiger Zug.' });
          }

          io.to(`lobby:${lobby.id}`).emit('game:state', {
            gameState: lobby.gameState,
            status: lobby.status,
            lobby,
          });

          callback?.({ success: true, gameState: lobby.gameState });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 6b. Live-Drawing für Zeichnen & Raten (Echtzeit-Synchronisation zum Fernseher)
    socket.on('draw:strokes', async (data: unknown) => {
      try {
        if (!(await consumeRateLimit(socket.id, 'draw:strokes'))) return;
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES['draw:strokes'])) return;

        const parsed = DrawStrokesSchema.safeParse(data);
        if (!parsed.success) return;

        const lobby = lobbyManager.getLobbyBySocketId(socket.id);
        if (!lobby || !lobby.gameState || lobby.status !== 'in-game') return;
        if (lobby.gameId !== 'draw-and-guess') return;

        const player = lobby.players.find((p) => p.socketId === socket.id);
        if (!player || player.id !== (lobby.gameState as any).currentDrawerId) return;

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
        if (!(await consumeRateLimit(socket.id, 'draw:clear'))) return;

        const lobby = lobbyManager.getLobbyBySocketId(socket.id);
        if (!lobby || !lobby.gameState || lobby.status !== 'in-game') return;
        if (lobby.gameId !== 'draw-and-guess') return;

        const player = lobby.players.find((p) => p.socketId === socket.id);
        if (!player || player.id !== (lobby.gameState as any).currentDrawerId) return;

        (lobby.gameState as any).strokes = [];
        socket.to(`lobby:${lobby.id}`).emit('draw:live-clear');
      } catch (err) {
        console.error('Fehler bei draw:clear:', err);
      }
    });

    socket.on('draw:undo', async () => {
      try {
        if (!(await consumeRateLimit(socket.id, 'draw:undo'))) return;

        const lobby = lobbyManager.getLobbyBySocketId(socket.id);
        if (!lobby || !lobby.gameState || lobby.status !== 'in-game') return;
        if (lobby.gameId !== 'draw-and-guess') return;

        const player = lobby.players.find((p) => p.socketId === socket.id);
        if (!player || player.id !== (lobby.gameState as any).currentDrawerId) return;

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
      async (callback?: (res: { success: boolean; lobby?: any; error?: string }) => void) => {
        if (!(await consumeRateLimit(socket.id, 'game:rematch'))) {
          return callback?.({ success: false, error: 'Zu viele Aktionen.' });
        }
        try {
          const { lobby, restarted, error } = lobbyManager.requestRematch(socket.id);
          if (error || !lobby) {
            return callback?.({ success: false, error: error || 'Revanche nicht möglich.' });
          }

          if (restarted) {
            io.to(`lobby:${lobby.id}`).emit('game:restarted', { lobby });
          } else {
            io.to(`lobby:${lobby.id}`).emit('lobby:updated', { lobby });
          }

          callback?.({ success: true, lobby });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 8. Lobby verlassen
    socket.on('lobby:leave', async (callback?: (res: { success: boolean }) => void) => {
      if (!(await consumeRateLimit(socket.id, 'lobby:leave'))) {
        return callback?.({ success: false });
      }
      try {
        const { lobbyId, lobby, wasHost, deleted } = lobbyManager.leaveCurrentLobby(socket.id);
        if (lobbyId) {
          socket.leave(`lobby:${lobbyId}`);
          if (deleted) {
            io.emit('lobby:list-updated', {});
          } else if (lobby) {
            io.to(`lobby:${lobby.id}`).emit('lobby:updated', {
              lobby,
              message: wasHost
                ? 'Neuer Host gewählt.'
                : 'Ein Spieler hat die Lobby verlassen.',
            });
            io.emit('lobby:list-updated', { gameId: lobby.gameId });
          }
        }
        callback?.({ success: true });
      } catch {
        callback?.({ success: false });
      }
    });

    // 9. Wiederverbinden nach Disconnect
    socket.on(
      'lobby:reconnect',
      async (
        data: unknown,
        callback?: (res: { success: boolean; lobby?: any }) => void
      ) => {
        if (!(await consumeRateLimit(socket.id, 'lobby:reconnect'))) {
          return callback?.({ success: false });
        }
        if (!isPayloadWithinLimit(data, EVENT_MAX_PAYLOAD_BYTES['lobby:reconnect'])) {
          return callback?.({ success: false });
        }
        const parsed = LobbyReconnectSchema.safeParse(data);
        if (!parsed.success) {
          return callback?.({ success: false });
        }
        try {
          const { lobby } = lobbyManager.reconnectPlayer({
            userId: parsed.data.userId,
            socketId: socket.id,
          });

          if (lobby) {
            socket.join(`lobby:${lobby.id}`);
            io.to(`lobby:${lobby.id}`).emit('lobby:updated', {
              lobby,
              message: 'Spieler ist wieder verbunden!',
            });
            return callback?.({ success: true, lobby });
          }
          callback?.({ success: false });
        } catch {
          callback?.({ success: false });
        }
      }
    );

    // 10. Disconnect
    socket.on('disconnect', () => {
      cleanupSocketRateLimit(socket.id);
      const { lobbyId, lobby, player } = lobbyManager.handleDisconnect(socket.id);
      if (lobbyId && lobby && player) {
        io.to(`lobby:${lobbyId}`).emit('lobby:player-disconnected', {
          playerId: player.id,
          playerName: player.name,
          lobby,
        });
      }
    });
  });
}
