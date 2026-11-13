import { Server as SocketIOServer, Socket } from 'socket.io';
import { lobbyManager } from './lobbyManager.js';
import { checkRateLimit, cleanupSocketRateLimit } from '../utils/rateLimiter.js';

export function registerSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    // 1. Liste offener Lobbys für ein beliebiges Spiel abrufen
    socket.on(
      'lobby:list',
      (
        data: { gameId: string },
        callback?: (res: { success: boolean; lobbies?: any[]; error?: string }) => void
      ) => {
        if (!checkRateLimit(socket.id)) {
          return callback?.({ success: false, error: 'Zu viele Anfragen. Bitte kurz warten.' });
        }
        try {
          const list = lobbyManager.getPublicLobbies(data?.gameId || '');
          callback?.({ success: true, lobbies: list });
        } catch (err: any) {
          callback?.({ success: false, error: err.message });
        }
      }
    );

    // 2. Lobby erstellen (generisch für alle Spiele, inkl. TV-Modus)
    socket.on(
      'lobby:create',
      (
        data: {
          name: string;
          isPrivate: boolean;
          gameId: string;
          userProfile: { id: string; name: string; avatar: any };
          isTvMode?: boolean;
        },
        callback?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        if (!checkRateLimit(socket.id)) {
          return callback?.({ success: false, error: 'Zu viele Anfragen.' });
        }
        try {
          if (!data || typeof data.gameId !== 'string' || !data.userProfile?.id) {
            return callback?.({ success: false, error: 'Ungültige Lobby-Daten.' });
          }

          const { lobby, error } = lobbyManager.createLobby({
            name: String(data.name || ''),
            isPrivate: Boolean(data.isPrivate),
            gameId: data.gameId,
            userProfile: data.userProfile,
            socketId: socket.id,
            isTvMode: data.isTvMode,
          });

          if (error || !lobby) {
            return callback?.({ success: false, error: error || 'Lobby konnte nicht erstellt werden.' });
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
      (
        data: { code: string },
        callback?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        try {
          if (!data || typeof data.code !== 'string') {
            return callback?.({ success: false, error: 'Kein gültiger Lobby-Code angegeben.' });
          }
          const lobby = lobbyManager.findLobbyByCode(data.code);
          if (!lobby) {
            return callback?.({ success: false, error: 'Lobby wurde nicht gefunden oder ist abgelaufen.' });
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
      (
        data: {
          lobbyIdOrCode: string;
          userProfile: { id: string; name: string; avatar: any };
        },
        callback?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        if (!checkRateLimit(socket.id)) {
          return callback?.({ success: false, error: 'Zu viele Anfragen.' });
        }
        try {
          if (!data || typeof data.lobbyIdOrCode !== 'string' || !data.userProfile?.id) {
            return callback?.({ success: false, error: 'Ungültige Beitrittsdaten.' });
          }

          const { lobby, error } = lobbyManager.joinLobby({
            lobbyIdOrCode: data.lobbyIdOrCode,
            userProfile: data.userProfile,
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
    socket.on('lobby:ready', (callback?: (res: { success: boolean; lobby?: any; error?: string }) => void) => {
      if (!checkRateLimit(socket.id)) {
        return callback?.({ success: false, error: 'Zu viele Aktionen.' });
      }
      try {
        const { lobby, error } = lobbyManager.toggleReady(socket.id);
        if (error || !lobby) {
          return callback?.({ success: false, error: error || 'Fehler beim Ändern des Bereit-Status.' });
        }

        io.to(`lobby:${lobby.id}`).emit('lobby:updated', { lobby });
        callback?.({ success: true, lobby });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // 4b. Lobby-Spieleinstellungen aktualisieren (Host)
    socket.on(
      'lobby:update-settings',
      (
        data: { settings: Record<string, any> },
        callback?: (res: { success: boolean; lobby?: any; error?: string }) => void
      ) => {
        if (!checkRateLimit(socket.id)) {
          return callback?.({ success: false, error: 'Zu viele Aktionen.' });
        }
        try {
          if (!data || typeof data.settings !== 'object' || data.settings === null) {
            return callback?.({ success: false, error: 'Ungültige Einstellungen.' });
          }
          const { lobby, error } = lobbyManager.updateSettings(socket.id, data.settings);
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

    // 5. Spiel durch Host starten
    socket.on('lobby:start', (callback?: (res: { success: boolean; lobby?: any; error?: string }) => void) => {
      if (!checkRateLimit(socket.id)) {
        return callback?.({ success: false, error: 'Zu viele Aktionen.' });
      }
      try {
        const { lobby, error } = lobbyManager.startGame(socket.id);
        if (error || !lobby) {
          return callback?.({ success: false, error: error || 'Spiel konnte nicht gestartet werden.' });
        }

        io.to(`lobby:${lobby.id}`).emit('game:started', { lobby });
        io.emit('lobby:list-updated', { gameId: lobby.gameId });
        callback?.({ success: true, lobby });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    // 6. Spielzug ausführen (generisch)
    socket.on(
      'game:move',
      (moveData: any, callback?: (res: { success: boolean; error?: string; gameState?: any }) => void) => {
        if (!checkRateLimit(socket.id)) {
          return callback?.({ success: false, error: 'Zu schnell! Bitte einen Moment warten.' });
        }
        try {
          const { lobby, error } = lobbyManager.makeMove(socket.id, moveData);
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
    socket.on('draw:strokes', (data: { strokes: any[] }) => {
      try {
        const lobby = lobbyManager.getLobbyBySocketId(socket.id);
        if (!lobby || !lobby.gameState || lobby.status !== 'in-game') return;
        if (lobby.gameId !== 'draw-and-guess') return;

        const player = lobby.players.find((p) => p.socketId === socket.id);
        if (!player || player.id !== (lobby.gameState as any).currentDrawerId) return;

        if (!Array.isArray(data?.strokes) || data.strokes.length === 0) return;

        const clamp01 = (n: unknown) =>
          typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;

        const sanitized = data.strokes.slice(0, 120).map((s: any) => ({
          x0: clamp01(s?.x0),
          y0: clamp01(s?.y0),
          x1: clamp01(s?.x1),
          y1: clamp01(s?.y1),
          color: typeof s?.color === 'string' && s.color.length <= 16 ? s.color : '#000000',
          size:
            typeof s?.size === 'number' && Number.isFinite(s.size)
              ? Math.max(1, Math.min(24, s.size))
              : 5,
          strokeId: typeof s?.strokeId === 'number' ? s.strokeId : undefined,
        }));

        const currentStrokes = (lobby.gameState as any).strokes || [];
        (lobby.gameState as any).strokes = [...currentStrokes, ...sanitized].slice(-3000);

        // Sofort live an den Fernseher und alle anderen Spieler streamen
        socket.to(`lobby:${lobby.id}`).emit('draw:live-strokes', {
          strokes: sanitized,
        });
      } catch (err) {
        console.error('Fehler bei draw:strokes:', err);
      }
    });

    socket.on('draw:clear', () => {
      try {
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

    socket.on('draw:undo', () => {
      try {
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
    socket.on('game:rematch', (callback?: (res: { success: boolean; lobby?: any; error?: string }) => void) => {
      if (!checkRateLimit(socket.id)) {
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
    });

    // 8. Lobby verlassen
    socket.on('lobby:leave', (callback?: (res: { success: boolean }) => void) => {
      try {
        const { lobbyId, lobby, wasHost, deleted } = lobbyManager.leaveCurrentLobby(socket.id);
        if (lobbyId) {
          socket.leave(`lobby:${lobbyId}`);
          if (deleted) {
            io.emit('lobby:list-updated', {});
          } else if (lobby) {
            io.to(`lobby:${lobby.id}`).emit('lobby:updated', {
              lobby,
              message: wasHost ? 'Neuer Host gewählt.' : 'Ein Spieler hat die Lobby verlassen.',
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
      (data: { userId: string }, callback?: (res: { success: boolean; lobby?: any }) => void) => {
        try {
          if (!data || typeof data.userId !== 'string') {
            return callback?.({ success: false });
          }
          const { lobby } = lobbyManager.reconnectPlayer({
            userId: data.userId,
            socketId: socket.id,
          });

          if (lobby) {
            socket.join(`lobby:${lobby.id}`);
            io.to(`lobby:${lobby.id}`).emit('lobby:updated', { lobby, message: 'Spieler ist wieder verbunden!' });
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
