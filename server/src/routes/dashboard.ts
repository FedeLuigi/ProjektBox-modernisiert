import { Router, type Request, type Response } from 'express';
import os from 'node:os';
import { type Server as SocketIOServer } from 'socket.io';
import { lobbyManager } from '../lobby/lobbyManager.js';
import { gameRegistry } from '../games/registry.js';
import { isDatabaseConfigured, isDatabaseConnected } from '../database/prismaClient.js';
import { renderDashboardHtml } from './dashboardTemplate.js';

let ioInstance: SocketIOServer | null = null;

export function setDashboardSocketIO(io: SocketIOServer): void {
  ioInstance = io;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}T`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function formatAge(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return `vor ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `vor ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  return `vor ${diffH}h ${diffMin % 60}m`;
}

export function getDashboardData() {
  const interfaces = os.networkInterfaces();
  const localIps: string[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIps.push(iface.address);
      }
    }
  }

  const isRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL);
  const renderUrl = process.env.RENDER_EXTERNAL_URL || null;
  const tvOrigin = process.env.TV_ORIGIN || process.env.TV_URL || null;
  const smartphoneOrigin = process.env.SMARTPHONE_ORIGIN || process.env.SMARTPHONE_URL || null;
  const mem = process.memoryUsage();
  const uptimeSec = Math.floor(process.uptime());

  const allLobbies = lobbyManager.getAllLobbies();

  const lobbiesData = allLobbies.map((lobby) => {
    const gameDef = gameRegistry.get(lobby.gameId);
    const activePlayers = lobby.players.filter((p) => !p.isTvScreen);
    const botPlayers = activePlayers.filter((p) => p.isBot);
    const humanPlayers = activePlayers.filter((p) => !p.isBot);
    const readyPlayers = activePlayers.filter((p) => p.isReady);

    return {
      id: lobby.id,
      code: lobby.code,
      name: lobby.name,
      gameId: lobby.gameId,
      gameTitle: gameDef?.title || lobby.gameId,
      isTvMode: Boolean(lobby.isTvMode),
      isSimulated: Boolean(lobby.isSimulated),
      status: lobby.status,
      stateVersion: lobby.stateVersion,
      minPlayers: lobby.minPlayers,
      maxPlayers: lobby.maxPlayers,
      createdAt: lobby.createdAt,
      ageFormatted: formatAge(lobby.createdAt),
      expiresAt: lobby.expiresAt,
      expiresInMinutes: Math.max(0, Math.round((lobby.expiresAt - Date.now()) / 60000)),
      totalPlayersCount: lobby.players.length,
      humanPlayersCount: humanPlayers.length,
      botPlayersCount: botPlayers.length,
      activePlayersCount: activePlayers.length,
      readyCount: readyPlayers.length,
      players: lobby.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isReady: p.isReady,
        isTvScreen: Boolean(p.isTvScreen),
        isBot: Boolean(p.isBot),
        connected: p.connected,
        connectionState: p.connectionState || (p.connected ? 'connected' : 'disconnected'),
        color: p.color,
        symbol: p.symbol,
        score: (lobby.gameState?.scores as Record<string, number> | undefined)?.[p.id] ?? 0,
        socketId: p.socketId,
      })),
      gameState: lobby.gameState
        ? {
            status: lobby.gameState.status,
            round: lobby.gameState.round,
            currentTurn: lobby.gameState.currentTurn,
            categoryName: lobby.gameState.categoryName,
            wordHint: lobby.gameState.wordHint,
            currentDrawerId: lobby.gameState.currentDrawerId,
            scores: lobby.gameState.scores,
            winnerId: lobby.gameState.winnerId,
          }
        : null,
      settings: lobby.settings,
    };
  });

  const registeredGames = gameRegistry.getAll().map((g) => ({
    id: g.id,
    title: g.title,
    minPlayers: g.minPlayers,
    maxPlayers: g.maxPlayers,
  }));

  const activeSockets = ioInstance?.engine?.clientsCount || 0;

  return {
    server: {
      status: 'online',
      service: 'ProjektBox Server',
      nodeVersion: process.version,
      platform: os.platform(),
      osType: os.type(),
      osRelease: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
      cpusCount: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || 'Unbekannt',
      loadAvg: os.loadavg().map((l) => Math.round(l * 100) / 100),
      uptimeSeconds: uptimeSec,
      uptimeFormatted: formatUptime(uptimeSec),
      memory: {
        heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
        heapTotalMB: Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10,
        rssMB: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
        heapPercent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
      },
      network: {
        port: Number(process.env.PORT) || 5001,
        localIps,
        isRender,
        renderUrl,
        tvOrigin,
        smartphoneOrigin,
      },
      database: {
        configured: isDatabaseConfigured(),
        connected: isDatabaseConnected(),
      },
      sockets: {
        activeClients: activeSockets,
      },
      timestamp: Date.now(),
    },
    stats: {
      totalLobbies: lobbiesData.length,
      waitingLobbies: lobbiesData.filter((l) => l.status === 'waiting').length,
      inGameLobbies: lobbiesData.filter((l) => l.status === 'in_progress' || l.status === 'starting').length,
      tvLobbies: lobbiesData.filter((l) => l.isTvMode).length,
      simulatedLobbies: lobbiesData.filter((l) => l.isSimulated).length,
      totalPlayers: lobbiesData.reduce((acc, l) => acc + l.totalPlayersCount, 0),
      humanPlayers: lobbiesData.reduce((acc, l) => acc + l.humanPlayersCount, 0),
      botPlayers: lobbiesData.reduce((acc, l) => acc + l.botPlayersCount, 0),
    },
    lobbies: lobbiesData,
    registeredGames,
  };
}

export const dashboardRouter = Router();

// JSON-API für Live-Updates
dashboardRouter.get('/data', (_req: Request, res: Response) => {
  res.json(getDashboardData());
});

// Admin-Aktion: Abgelaufene Lobbys bereinigen
dashboardRouter.post('/cleanup', (_req: Request, res: Response) => {
  const removedIds = lobbyManager.cleanupExpiredLobbies();
  res.json({
    success: true,
    removedCount: removedIds.length,
    message:
      removedIds.length > 0
        ? `${removedIds.length} abgelaufene Lobby(s) bereinigt.`
        : 'Keine abgelaufenen Lobbys vorhanden.',
  });
});

// Admin-Aktion: Bestimmte Lobby schließen
dashboardRouter.post('/close-lobby', (req: Request, res: Response) => {
  const { lobbyId } = req.body ?? {};
  if (!lobbyId || typeof lobbyId !== 'string') {
    res.status(400).json({ success: false, error: 'lobbyId fehlt' });
    return;
  }
  const deleted = lobbyManager.closeLobby(lobbyId);
  res.json({ success: deleted, message: deleted ? 'Lobby geschlossen.' : 'Lobby nicht gefunden.' });
});

// HTML-Dashboard Handler
export function handleDashboardPage(_req: Request, res: Response): void {
  const data = getDashboardData();
  const html = renderDashboardHtml(data);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(html);
}

// HTML-Dashboard
dashboardRouter.get('/', handleDashboardPage);
