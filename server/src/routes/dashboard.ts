import { Router, type Request, type Response } from 'express';
import os from 'node:os';
import { type Server as SocketIOServer } from 'socket.io';
import { lobbyManager } from '../lobby/lobbyManager.js';
import { gameRegistry } from '../games/registry.js';
import { isDatabaseConfigured, isDatabaseConnected } from '../database/prismaClient.js';

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
  res.send(html);
}

// HTML-Dashboard
dashboardRouter.get('/', handleDashboardPage);

function renderDashboardHtml(initialData: ReturnType<typeof getDashboardData>): string {
  const initialJson = JSON.stringify(initialData).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="de" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ProjektBox | Server Dashboard</title>
  <style>
    :root {
      --bg: #0B132B;
      --card-bg: #1C2541;
      --card-border: #334155;
      --text-main: #F8FAFC;
      --text-muted: #94A3B8;
      --accent-gold: #F59E0B;
      --accent-emerald: #10B981;
      --accent-rose: #F43F5E;
      --accent-indigo: #6366F1;
      --accent-cyan: #06B6D4;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    body {
      background-color: var(--bg);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      line-height: 1.5;
    }
    header {
      background: #111C3A;
      border-bottom: 2px solid var(--card-border);
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(8px);
    }
    .logo-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge-icon {
      background: linear-gradient(135deg, #F59E0B, #D97706);
      color: #0F172A;
      font-weight: 900;
      font-size: 14px;
      padding: 6px 10px;
      border-radius: 6px;
      letter-spacing: 1px;
    }
    .logo-title {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #FFFFFF;
    }
    .logo-title span {
      color: var(--accent-gold);
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34D399;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #10B981;
      box-shadow: 0 0 10px #10B981;
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .btn {
      background: #1E293B;
      color: #F8FAFC;
      border: 1px solid var(--card-border);
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn:hover {
      background: #334155;
      border-color: #64748B;
      color: #FFFFFF;
    }
    .btn-gold {
      background: rgba(245, 158, 11, 0.15);
      border-color: rgba(245, 158, 11, 0.4);
      color: #FDE68A;
    }
    .btn-gold:hover {
      background: rgba(245, 158, 11, 0.28);
      border-color: var(--accent-gold);
      color: #FFFFFF;
    }
    .btn-danger {
      background: rgba(244, 63, 94, 0.15);
      border-color: rgba(244, 63, 94, 0.4);
      color: #FECDD3;
    }
    .btn-danger:hover {
      background: rgba(244, 63, 94, 0.28);
      border-color: var(--accent-rose);
    }
    .refresh-bar-container {
      width: 100%;
      height: 3px;
      background: rgba(255, 255, 255, 0.05);
      position: sticky;
      top: 59px;
      z-index: 99;
    }
    .refresh-bar {
      height: 100%;
      background: linear-gradient(90deg, #F59E0B, #10B981);
      width: 0%;
      transition: width 0.1s linear;
    }
    main {
      flex: 1;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .grid-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      position: relative;
      overflow: hidden;
    }
    .stat-card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--card-accent, #64748B);
    }
    .stat-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .stat-value {
      font-size: 1.85rem;
      font-weight: 800;
      color: #FFFFFF;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .stat-sub {
      font-size: 0.78rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .progress-track {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 9999px;
      margin-top: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--card-accent, #10B981);
      border-radius: 9999px;
    }
    .section-title {
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .panel {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    }
    .empty-state {
      padding: 48px 24px;
      text-align: center;
      color: var(--text-muted);
    }
    .empty-state h3 {
      color: #F8FAFC;
      margin-bottom: 8px;
      font-size: 1.1rem;
    }
    .lobby-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 16px;
      padding: 16px;
    }
    .lobby-card {
      background: #111A33;
      border: 1px solid #2D3A5D;
      border-radius: 10px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .lobby-card:hover {
      border-color: var(--accent-gold);
      transform: translateY(-2px);
    }
    .lobby-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }
    .lobby-code-badge {
      font-family: monospace;
      font-size: 1.4rem;
      font-weight: 900;
      letter-spacing: 0.15em;
      color: #FBBF24;
      background: #0F172A;
      border: 2px solid #F59E0B;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
    }
    .lobby-name {
      font-weight: 700;
      font-size: 1.05rem;
      color: #FFFFFF;
    }
    .lobby-game-tag {
      font-size: 0.75rem;
      font-weight: 700;
      color: #38BDF8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .pill {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .pill-green {
      background: rgba(16, 185, 129, 0.2);
      color: #34D399;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .pill-amber {
      background: rgba(245, 158, 11, 0.2);
      color: #FCD34D;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .pill-purple {
      background: rgba(168, 85, 247, 0.2);
      color: #D8B4FE;
      border: 1px solid rgba(168, 85, 247, 0.4);
    }
    .pill-blue {
      background: rgba(56, 189, 248, 0.2);
      color: #7DD3FC;
      border: 1px solid rgba(56, 189, 248, 0.4);
    }
    .pill-rose {
      background: rgba(244, 63, 94, 0.2);
      color: #FDA4AF;
      border: 1px solid rgba(244, 63, 94, 0.4);
    }
    .player-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: #0B132B;
      border: 1px solid #1E293B;
      border-radius: 6px;
      padding: 8px 10px;
      max-height: 180px;
      overflow-y: auto;
    }
    .player-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 0.8rem;
    }
    .player-info {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex: 1;
    }
    .player-name {
      font-weight: 600;
      color: #F1F5F9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }
    .info-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 16px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      font-size: 0.85rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 6px;
    }
    .info-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .info-key {
      color: var(--text-muted);
      font-weight: 600;
    }
    .info-val {
      color: #FFFFFF;
      font-weight: 700;
      text-align: right;
      word-break: break-all;
    }
    .info-val a {
      color: var(--accent-cyan);
      text-decoration: none;
    }
    .info-val a:hover {
      text-decoration: underline;
    }
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #059669;
      color: #FFFFFF;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.85rem;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
      display: none;
      z-index: 200;
    }
    footer {
      border-top: 1px solid var(--card-border);
      padding: 16px 24px;
      text-align: center;
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: auto;
    }
    footer a {
      color: var(--accent-gold);
      text-decoration: none;
    }
  </style>
</head>
<body>
  <header>
    <div class="logo-area">
      <div class="badge-icon">BOX</div>
      <div>
        <h1 class="logo-title">PROJEKT<span>BOX</span> SERVER</h1>
        <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">BACKEND & MULTIPLAYER DASHBOARD</div>
      </div>
    </div>

    <div class="header-actions">
      <div class="status-pill">
        <div class="pulse-dot"></div>
        <span id="server-status-label">ONLINE</span>
      </div>

      <button id="btn-toggle-refresh" class="btn btn-gold" onclick="toggleAutoRefresh()">
        <span id="refresh-icon">⚡</span>
        <span id="refresh-text">Live (3s)</span>
      </button>

      <button class="btn" onclick="fetchLiveStats(true)">
        🔄 Aktualisieren
      </button>

      <button class="btn btn-danger" onclick="triggerCleanup()" title="Abgelaufene Räume manuell aus dem Speicher löschen">
        🧹 Lobbys bereinigen
      </button>

      <a id="link-tv" href="http://localhost:5174" target="_blank" class="btn" style="display:none;">
        📺 TV App
      </a>

      <a id="link-smartphone" href="http://localhost:5173" target="_blank" class="btn" style="display:none;">
        📱 Smartphone App
      </a>
    </div>
  </header>

  <div class="refresh-bar-container">
    <div id="refresh-progress" class="refresh-bar"></div>
  </div>

  <main>
    <!-- STATISTIK-KARTEN -->
    <div class="grid-stats">
      <div class="stat-card" style="--card-accent: #F59E0B;">
        <span class="stat-label">Aktive Lobbys</span>
        <div class="stat-value" id="stat-lobbies-total">0</div>
        <div class="stat-sub" id="stat-lobbies-sub">0 Warteraum • 0 Im Spiel</div>
      </div>

      <div class="stat-card" style="--card-accent: #A855F7;">
        <span class="stat-label">TV-Screen Partys</span>
        <div class="stat-value" id="stat-tv-total">0</div>
        <div class="stat-sub" id="stat-tv-sub">📺 TV als Host & Beamer</div>
      </div>

      <div class="stat-card" style="--card-accent: #10B981;">
        <span class="stat-label">Verbundene Spieler</span>
        <div class="stat-value" id="stat-players-total">0</div>
        <div class="stat-sub" id="stat-players-sub">0 Spieler • 0 TV • 0 Bots</div>
      </div>

      <div class="stat-card" style="--card-accent: #06B6D4;">
        <span class="stat-label">WebSockets (Socket.io)</span>
        <div class="stat-value" id="stat-sockets-total">0</div>
        <div class="stat-sub">Aktive WebSocket Clients</div>
      </div>

      <div class="stat-card" style="--card-accent: #6366F1;">
        <span class="stat-label">Neon PostgreSQL</span>
        <div class="stat-value" id="stat-db-status">--</div>
        <div class="stat-sub" id="stat-db-sub">Datenbank-Status</div>
      </div>

      <div class="stat-card" style="--card-accent: #EC4899;">
        <span class="stat-label">RAM (Heap Memory)</span>
        <div class="stat-value" id="stat-mem-used">0 MB</div>
        <div class="progress-track">
          <div id="stat-mem-fill" class="progress-fill" style="width: 0%; background: #EC4899;"></div>
        </div>
        <div class="stat-sub" id="stat-mem-sub" style="margin-top: 4px;">0 MB Total (0%)</div>
      </div>
    </div>

    <!-- AKTIVE LOBBYS BEREICH -->
    <div>
      <div class="section-title">
        <span>🎮 Aktuelle Räume & Lobbys (<span id="lobbies-count-badge">0</span>)</span>
      </div>

      <div class="panel">
        <div id="lobbies-container"></div>
      </div>
    </div>

    <!-- SERVER-INFO & SYSTEM-DETAILS -->
    <div class="info-grid">
      <!-- SYSTEM & SPEICHER -->
      <div>
        <div class="section-title">🖥️ Server & System-Umgebung</div>
        <div class="panel">
          <div class="info-list">
            <div class="info-row">
              <span class="info-key">Server Uptime</span>
              <span class="info-val" id="sys-uptime">--</span>
            </div>
            <div class="info-row">
              <span class="info-key">Betriebssystem</span>
              <span class="info-val" id="sys-os">--</span>
            </div>
            <div class="info-row">
              <span class="info-key">CPU Cores</span>
              <span class="info-val" id="sys-cpus">--</span>
            </div>
            <div class="info-row">
              <span class="info-key">Load Average (1m, 5m, 15m)</span>
              <span class="info-val" id="sys-load">--</span>
            </div>
            <div class="info-row">
              <span class="info-key">RSS Memory (Total Process)</span>
              <span class="info-val" id="sys-rss">--</span>
            </div>
            <div class="info-row">
              <span class="info-key">Cloud Hosting</span>
              <span class="info-val" id="sys-cloud">--</span>
            </div>
            <div class="info-row">
              <span class="info-key">Node.js Version</span>
              <span class="info-val" id="sys-node">--</span>
            </div>
          </div>
        </div>
      </div>

      <!-- NETZWERK & SCHNITTSTELLEN -->
      <div>
        <div class="section-title">🌐 Netzwerk & REST Endpunkte</div>
        <div class="panel">
          <div class="info-list">
            <div class="info-row">
              <span class="info-key">Server Port</span>
              <span class="info-val" id="net-port">5001</span>
            </div>
            <div class="info-row">
              <span class="info-key">TV App Origin</span>
              <span class="info-val" id="net-tv-origin">--</span>
            </div>
            <div class="info-row">
              <span class="info-key">Smartphone App Origin</span>
              <span class="info-val" id="net-phone-origin">--</span>
            </div>
            <div class="info-row">
              <span class="info-key">Lokale LAN IPs (WLAN)</span>
              <span class="info-val" id="net-ips">--</span>
            </div>
            <div class="info-row">
              <span class="info-key">Healthcheck Endpunkt</span>
              <span class="info-val"><a href="/healthz" target="_blank">/healthz</a></span>
            </div>
            <div class="info-row">
              <span class="info-key">REST Service Health</span>
              <span class="info-val"><a href="/api/health" target="_blank">/api/health</a></span>
            </div>
            <div class="info-row">
              <span class="info-key">Dashboard Live API</span>
              <span class="info-val"><a href="/api/dashboard" target="_blank">/api/dashboard</a></span>
            </div>
          </div>
        </div>
      </div>

      <!-- REGISTRIERTE SPIELE -->
      <div style="grid-column: 1 / -1;">
        <div class="section-title">🎲 Registrierte Multiplayer-Spiele</div>
        <div class="panel" style="padding: 16px;">
          <div id="games-list-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px;"></div>
        </div>
      </div>
    </div>
  </main>

  <div id="toast" class="toast">Aktion erfolgreich!</div>

  <footer>
    ProjektBox Backend Server • Port <span id="footer-port">5001</span> • Echtzeit Multiplayer Engine mit Socket.io
  </footer>

  <script>
    let autoRefreshActive = true;
    let refreshInterval = 3000;
    let progressTimer = null;
    let currentData = ${initialJson};

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 2500);
    }

    function copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Code "' + text + '" kopiert!');
      });
    }

    function toggleAutoRefresh() {
      autoRefreshActive = !autoRefreshActive;
      const text = document.getElementById('refresh-text');
      const icon = document.getElementById('refresh-icon');
      const btn = document.getElementById('btn-toggle-refresh');

      if (autoRefreshActive) {
        text.innerText = 'Live (3s)';
        icon.innerText = '⚡';
        btn.classList.add('btn-gold');
        startProgress();
      } else {
        text.innerText = 'Pausiert';
        icon.innerText = '⏸️';
        btn.classList.remove('btn-gold');
        clearInterval(progressTimer);
        document.getElementById('refresh-progress').style.width = '0%';
      }
    }

    function startProgress() {
      clearInterval(progressTimer);
      if (!autoRefreshActive) return;

      const bar = document.getElementById('refresh-progress');
      const start = Date.now();

      progressTimer = setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.min(100, (elapsed / refreshInterval) * 100);
        bar.style.width = pct + '%';

        if (pct >= 100) {
          clearInterval(progressTimer);
          bar.style.width = '0%';
          fetchLiveStats();
        }
      }, 50);
    }

    async function fetchLiveStats(manual = false) {
      try {
        const res = await fetch('/dashboard/data');
        if (res.ok) {
          currentData = await res.json();
          renderData(currentData);
          if (manual) showToast('Dashboard aktualisiert');
        }
      } catch (err) {
        console.error('Fehler beim Abrufen der Dashboard-Daten:', err);
      } finally {
        if (autoRefreshActive) startProgress();
      }
    }

    async function triggerCleanup() {
      try {
        const res = await fetch('/dashboard/cleanup', { method: 'POST' });
        const json = await res.json();
        showToast(json.message || 'Bereinigt');
        fetchLiveStats();
      } catch (e) {
        showToast('Fehler bei der Bereinigung');
      }
    }

    async function closeLobby(lobbyId) {
      if (!confirm('Möchtest du diese Lobby wirklich schließen?')) return;
      try {
        const res = await fetch('/dashboard/close-lobby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lobbyId })
        });
        const json = await res.json();
        showToast(json.message);
        fetchLiveStats();
      } catch (e) {
        showToast('Fehler beim Schließen der Lobby');
      }
    }

    function renderData(data) {
      // 1. STATS KARTEN
      document.getElementById('stat-lobbies-total').innerText = data.stats.totalLobbies;
      document.getElementById('stat-lobbies-sub').innerText =
        data.stats.waitingLobbies + ' Warteraum • ' + data.stats.inGameLobbies + ' Im Spiel';

      document.getElementById('stat-tv-total').innerText = data.stats.tvLobbies;
      document.getElementById('stat-tv-sub').innerText =
        '📺 ' + data.stats.tvLobbies + ' TV • 🤖 ' + data.stats.simulatedLobbies + ' Sim.';

      document.getElementById('stat-players-total').innerText = data.stats.totalPlayers;
      const tvScreens = Math.max(0, data.stats.totalPlayers - data.stats.humanPlayers - data.stats.botPlayers);
      document.getElementById('stat-players-sub').innerText =
        data.stats.humanPlayers + ' Spieler • ' + tvScreens + ' TV • ' + data.stats.botPlayers + ' Bots';

      document.getElementById('stat-sockets-total').innerText = data.server.sockets.activeClients;

      const dbEl = document.getElementById('stat-db-status');
      const dbSub = document.getElementById('stat-db-sub');
      if (!data.server.database.configured) {
        dbEl.innerText = 'In-Memory';
        dbEl.style.color = '#FCD34D';
        dbSub.innerText = 'DATABASE_URL nicht gesetzt';
      } else if (data.server.database.connected) {
        dbEl.innerText = 'Verbunden';
        dbEl.style.color = '#34D399';
        dbSub.innerText = 'PostgreSQL aktiv';
      } else {
        dbEl.innerText = 'Getrennt';
        dbEl.style.color = '#FDA4AF';
        dbSub.innerText = 'Verbindung fehlgeschlagen';
      }

      document.getElementById('stat-mem-used').innerText = data.server.memory.heapUsedMB + ' MB';
      document.getElementById('stat-mem-fill').style.width = data.server.memory.heapPercent + '%';
      document.getElementById('stat-mem-sub').innerText =
        data.server.memory.heapTotalMB + ' MB Total (' + data.server.memory.heapPercent + '%)';

      document.getElementById('lobbies-count-badge').innerText = data.lobbies.length;

      // 2. LOBBIES RENDERN
      const container = document.getElementById('lobbies-container');
      if (data.lobbies.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <div style="font-size: 2.5rem; margin-bottom: 8px;">🎮</div>
            <h3>Keine aktiven Lobbys</h3>
            <p>Es sind aktuell keine offenen Spielräume vorhanden. Starte ein Spiel über die TV- oder Smartphone-App, um Lobbys hier live zu überwachen.</p>
          </div>
        \`;
      } else {
        let html = '<div class="lobby-grid">';
        for (const lobby of data.lobbies) {
          const isTv = lobby.isTvMode;
          const statusClass =
            lobby.status === 'in_progress' || lobby.status === 'starting'
              ? 'pill-green'
              : lobby.status === 'paused' || lobby.status === 'expired'
                ? 'pill-rose'
                : 'pill-amber';
          const statusText =
            lobby.status === 'in_progress'
              ? '🎮 Im Spiel'
              : lobby.status === 'starting'
                ? '🚀 Startet'
                : lobby.status === 'paused'
                  ? '⏸️ Pausiert'
                  : lobby.status === 'finished'
                    ? '🏁 Beendet'
                    : '⏳ Warteraum';

          html += \`
            <div class="lobby-card">
              <div class="lobby-header">
                <div>
                  <div class="lobby-name">\${escapeHtml(lobby.name)}</div>
                  <div class="lobby-game-tag">\${escapeHtml(lobby.gameTitle)}</div>
                </div>
                <div class="lobby-code-badge" title="Klicken zum Kopieren" onclick="copyToClipboard('\${escapeHtml(lobby.code)}')">\${escapeHtml(lobby.code)}</div>
              </div>

              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <span class="pill \${statusClass}">\${statusText}</span>
                \${isTv ? '<span class="pill pill-purple">📺 TV Screen</span>' : '<span class="pill pill-blue">📱 Standard</span>'}
                \${lobby.isSimulated ? '<span class="pill pill-blue">🤖 Simulation</span>' : ''}
                <span class="pill" style="background: rgba(255,255,255,0.08); color: #CBD5E1;">
                  👥 \${lobby.activePlayersCount}/\${lobby.maxPlayers} Spieler
                </span>
                <span class="pill" style="background: rgba(255,255,255,0.05); color: #94A3B8;">
                  ⏱️ \${lobby.ageFormatted}
                </span>
              </div>

              <div class="player-list">
                \${lobby.players.map(p => {
                  const role = p.isTvScreen
                    ? '<span class="pill pill-purple">📺 TV</span>'
                    : p.isBot
                      ? '<span class="pill pill-blue">🤖 Bot</span>'
                      : p.isHost
                        ? '<span class="pill pill-amber">👑 Host</span>'
                        : '<span class="pill" style="background:rgba(255,255,255,0.08);">Gast</span>';
                  const ready = p.isTvScreen
                    ? ''
                    : p.isReady
                      ? '<span style="color:#10B981; font-weight:700;">✓ Bereit</span>'
                      : '<span style="color:#94A3B8;">Wartet</span>';
                  const conn = p.connected || p.isBot
                    ? ''
                    : '<span style="color:#EF4444; font-weight:700;">⚡ Getrennt</span>';
                  return \`
                    <div class="player-row">
                      <div class="player-info">
                        \${role}
                        <span class="player-name">\${escapeHtml(p.name)}</span>
                      </div>
                      <div style="display:flex; align-items:center; gap:6px; font-size:0.75rem;">
                        \${conn || ready}
                        <span style="color:#F59E0B; font-weight:700;">\${p.score}P</span>
                      </div>
                    </div>
                  \`;
                }).join('')}
              </div>

              \${lobby.gameState ? \`
                <div style="background:#0F172A; border:1px solid #1E293B; border-radius:6px; padding:8px 10px; font-size:0.78rem; display:flex; flex-direction:column; gap:4px;">
                  <div style="font-weight:700; color:#38BDF8;">Spiel-Zustand: \${escapeHtml(lobby.gameState.status)}</div>
                  \${lobby.gameState.round ? \`<div>Runde: <b>\${lobby.gameState.round}</b></div>\` : ''}
                  \${lobby.gameState.categoryName ? \`<div>Kategorie: <b>\${escapeHtml(lobby.gameState.categoryName)}</b></div>\` : ''}
                  \${lobby.gameState.wordHint ? \`<div>Hinweis: <code>\${escapeHtml(lobby.gameState.wordHint)}</code></div>\` : ''}
                </div>
              \` : ''}

              <div style="display:flex; justify-content:space-between; align-items:center; padding-top:4px; font-size:0.75rem; color:#64748B;">
                <span>Gültig für noch \${lobby.expiresInMinutes} Min. (v\${lobby.stateVersion})</span>
                <button class="btn btn-danger" style="padding: 2px 8px; font-size: 0.72rem;" onclick="closeLobby('\${escapeHtml(lobby.id)}')">Schließen</button>
              </div>
            </div>
          \`;
        }
        html += '</div>';
        container.innerHTML = html;
      }

      // 3. SYSTEM & NETZWERK INFOS
      document.getElementById('sys-uptime').innerText = data.server.uptimeFormatted;
      document.getElementById('sys-os').innerText = data.server.osType + ' (' + data.server.platform + ' ' + data.server.arch + ')';
      document.getElementById('sys-cpus').innerText = data.server.cpusCount + ' Kerne (' + data.server.cpuModel + ')';
      document.getElementById('sys-load').innerText = data.server.loadAvg.join(', ');
      document.getElementById('sys-rss').innerText = data.server.memory.rssMB + ' MB';
      document.getElementById('sys-cloud').innerText = data.server.network.isRender ? 'Render.com Cloud' : 'Lokal / Eigener Server';
      document.getElementById('sys-node').innerText = data.server.nodeVersion;

      document.getElementById('net-port').innerText = data.server.network.port;
      document.getElementById('footer-port').innerText = data.server.network.port;

      const tvOriginEl = document.getElementById('net-tv-origin');
      const phoneOriginEl = document.getElementById('net-phone-origin');
      const linkTv = document.getElementById('link-tv');
      const linkPhone = document.getElementById('link-smartphone');

      if (data.server.network.tvOrigin) {
        const safeTv = escapeHtml(data.server.network.tvOrigin);
        tvOriginEl.innerHTML = \`<a href="\${safeTv}" target="_blank">\${safeTv}</a>\`;
        linkTv.href = data.server.network.tvOrigin;
        linkTv.style.display = 'inline-flex';
      } else if (window.location.port === '5001') {
        const localTv = 'http://' + window.location.hostname + ':5174';
        tvOriginEl.innerHTML = \`<a href="\${localTv}" target="_blank">\${localTv}</a>\`;
        linkTv.href = localTv;
        linkTv.style.display = 'inline-flex';
      } else {
        tvOriginEl.innerText = 'Nicht konfiguriert';
        linkTv.style.display = 'none';
      }

      if (data.server.network.smartphoneOrigin) {
        const safePhone = escapeHtml(data.server.network.smartphoneOrigin);
        phoneOriginEl.innerHTML = \`<a href="\${safePhone}" target="_blank">\${safePhone}</a>\`;
        linkPhone.href = data.server.network.smartphoneOrigin;
        linkPhone.style.display = 'inline-flex';
      } else if (window.location.port === '5001') {
        const localPhone = 'http://' + window.location.hostname + ':5173';
        phoneOriginEl.innerHTML = \`<a href="\${localPhone}" target="_blank">\${localPhone}</a>\`;
        linkPhone.href = localPhone;
        linkPhone.style.display = 'inline-flex';
      } else {
        phoneOriginEl.innerText = 'Nicht konfiguriert';
        linkPhone.style.display = 'none';
      }

      const ipsContainer = document.getElementById('net-ips');
      if (data.server.network.localIps && data.server.network.localIps.length > 0) {
        ipsContainer.innerHTML = data.server.network.localIps.map(ip =>
          \`<a href="http://\${ip}:\${data.server.network.port}" target="_blank">\${ip}</a>\`
        ).join(', ');
      } else {
        ipsContainer.innerText = 'Keine externen LAN-IPs';
      }

      // 4. REGISTRIERTE SPIELE
      const gamesGrid = document.getElementById('games-list-grid');
      gamesGrid.innerHTML = data.registeredGames.map(g => \`
        <div style="background:#111A33; border:1px solid #2D3A5D; border-radius:8px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:700; color:#FFFFFF; font-size:0.9rem;">\${escapeHtml(g.title)}</div>
            <div style="font-size:0.75rem; color:#94A3B8;">ID: <code>\${escapeHtml(g.id)}</code></div>
          </div>
          <span class="pill pill-green">\${g.minPlayers}–\${g.maxPlayers} SP.</span>
        </div>
      \`).join('');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // Initiale Darstellung
    renderData(currentData);
    startProgress();
  </script>
</body>
</html>`;
}
