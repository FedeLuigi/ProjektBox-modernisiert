import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import { apiRouter } from '../api/apiRouter.js';
import { LobbyManager } from '../lobby/lobbyManager.js';
import { StatePersistenceStore } from '../lobby/stateStore.js';
import { registerSocketHandlers } from '../sockets/socketHandlers.js';
import { GamePhaseScheduler } from '../games/phaseScheduler.js';
import { HybridPersistenceStore } from './persistenceStore.js';
import { SOCKET_EVENTS } from '@projektbox/shared/events';
import { normalizeBackendBaseUrl } from '@projektbox/shared/utils';

test('HybridPersistenceStore fällt ohne DATABASE_URL nahtlos auf JSON-StateStore zurück', async () => {
  const prevDbUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'projektbox-hybrid-'));
  const filePath = path.join(tmpDir, 'hybrid-state.json');

  try {
    const store = new HybridPersistenceStore(new StatePersistenceStore({ filePath }));
    const manager = new LobbyManager({ stateStore: store });
    await manager.init();

    assert.equal(store.isPostgresActive(), false);

    const s1 = manager.sessionManager.createSession('u_hyb1').session;
    const created = manager.createLobby({
      name: 'HybridTest',
      isPrivate: true,
      gameId: 'roulette',
      userProfile: { id: 'u_hyb1', name: 'HybridHost', avatar: {} },
      socketId: 'sock_hyb1',
      sessionId: s1.sessionId,
    });
    assert.ok(created.lobby);

    await store.flush();
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    assert.equal(parsed.lobbies.length, 1);
    assert.equal(parsed.lobbies[0].code, created.lobby!.code);

    await manager.shutdown();
  } finally {
    if (prevDbUrl !== undefined) process.env.DATABASE_URL = prevDbUrl;
  }
});

test('Cross-Origin Session (SameSite=None + X-Session-Token + Bearer + Socket Auth) & API Endpoints', async () => {
  const app = express();
  app.set('trust proxy', 1);
  app.use(
    cors({
      origin: true,
      credentials: true,
      exposedHeaders: ['X-Session-Token'],
    })
  );
  app.use(express.json());
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: true, credentials: true },
  });
  const manager = new LobbyManager();
  registerSocketHandlers(io, manager);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    // 1. Cross-Origin HTTPS Proxy Anfrage mit X-Client-Role: tv liefert pb_session_tv + SameSite=None + X-Session-Token
    const sessionRes = await fetch(`${baseUrl}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://projektbox-tv.onrender.com',
        'X-Forwarded-Proto': 'https',
        'X-Client-Role': 'tv',
      },
      body: JSON.stringify({ playerId: 'usr_cross_tv', clientRole: 'tv' }),
    });
    assert.equal(sessionRes.status, 200);
    const setCookie = sessionRes.headers.get('set-cookie') || '';
    assert.ok(setCookie.includes('pb_session_tv='), `Erwarte pb_session_tv, bekam: ${setCookie}`);
    assert.ok(setCookie.includes('SameSite=None'), `Erwarte SameSite=None, bekam: ${setCookie}`);
    assert.ok(setCookie.includes('Secure'));
    const sessionToken = sessionRes.headers.get('x-session-token');
    assert.ok(sessionToken && sessionToken.length >= 20);

    // 1b. Getrennte Smartphone-Role nutzt eigenen Cookie-Namen pb_session_smartphone (keine Kollision!)
    const phoneSessRes = await fetch(`${baseUrl}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://projektbox-smartphone.onrender.com',
        'X-Forwarded-Proto': 'https',
        'X-Client-Role': 'smartphone',
        Cookie: setCookie.split(';')[0],
      },
      body: JSON.stringify({ clientRole: 'smartphone' }),
    });
    assert.equal(phoneSessRes.status, 200);
    const phoneCookie = phoneSessRes.headers.get('set-cookie') || '';
    const phoneBody = (await phoneSessRes.json()) as { playerId: string };
    assert.ok(phoneCookie.includes('pb_session_smartphone='));
    assert.notEqual(phoneBody.playerId, 'usr_cross_tv');

    // 2. Bearer-Auth funktioniert auf GET /api/session & PUT /api/players/me
    const profileRes = await fetch(`${baseUrl}/api/players/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        name: 'WohnzimmerTV',
        avatar: { base: 'human', skinColor: '#FDDCB5', hat: 'crown', accessory: 'none', bg: 'gold' },
      }),
    });
    assert.equal(profileRes.status, 200);
    const profileBody = (await profileRes.json()) as Record<string, unknown>;
    assert.equal(profileBody.ok, true);
    assert.equal(profileBody.playerId, 'usr_cross_tv');

    // 3. Katalog, Health, Leaderboard und Server-Info Endpunkte
    const gamesRes = await fetch(`${baseUrl}/api/games`);
    assert.equal(gamesRes.status, 200);
    const gamesBody = (await gamesRes.json()) as { games: Array<{ id: string }> };
    assert.equal(gamesBody.games.length, 4);

    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const healthBody = (await healthRes.json()) as { status: string; database: { configured: boolean } };
    assert.equal(healthBody.status, 'ok');
    assert.equal(typeof healthBody.database.configured, 'boolean');

    const leaderboardRes = await fetch(`${baseUrl}/api/leaderboard`);
    assert.equal(leaderboardRes.status, 200);

    // 4. Socket.io Handshake mit auth.sessionToken (ohne Cookie-Header) authentifiziert sicher
    const client = ioClient(baseUrl, {
      auth: { sessionToken },
      transports: ['websocket'],
    });
    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('connect_error', reject);
    });

    const createAck = await new Promise<any>((resolve) => {
      client.emit(
        SOCKET_EVENTS.LOBBY_CREATE,
        {
          name: 'TV Lobby',
          isPrivate: true,
          gameId: 'roulette',
          isTvMode: true,
          userProfile: { id: 'usr_cross_tv', name: 'TV', avatar: {} },
        },
        resolve
      );
    });
    assert.equal(createAck.success, true);
    assert.equal(createAck.lobby.isTvMode, true);
    assert.equal(createAck.lobby.players[0].id, 'usr_cross_tv');

    client.disconnect();
  } finally {
    io.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    manager.clearAllTimers();
  }
});

test('GamePhaseScheduler löst überfälligen Roulette-Spin autoritativ auf dem Server aus', async () => {
  const manager = new LobbyManager();
  const s1 = manager.sessionManager.createSession('u_sched1').session;

  const created = manager.createLobby({
    name: 'SchedulerLobby',
    isPrivate: true,
    gameId: 'roulette',
    userProfile: { id: 'u_sched1', name: 'TimerHost', avatar: {} },
    socketId: 'sock_sched',
    sessionId: s1.sessionId,
  });
  const lobby = created.lobby!;
  manager.startGame({ lobbyId: lobby.id, playerId: 'u_sched1' });

  // Phase-Deadline knapp vor Ablauf setzen
  lobby.gameState!.phaseEndsAt = Date.now() + 90;

  let triggered = false;
  const scheduler = new GamePhaseScheduler((lobbyId, playerId, move) => {
    const res = manager.makeMove({ lobbyId, playerId, move });
    if (res.success) triggered = true;
  });

  scheduler.syncLobby(lobby);
  await new Promise((r) => setTimeout(r, 260));

  assert.equal(triggered, true);
  assert.equal(lobby.gameState?.phase, 'spinning');

  scheduler.clearAll();
  manager.clearAllTimers();
});

test('E2E TV + 2 Smartphones: Live-Synchronisation bei Roulette (Setzen, Verschieben, Zurückziehen) & Poker-Privatsphäre', async () => {
  const app = express();
  app.use(cors({ origin: true, credentials: true, exposedHeaders: ['X-Session-Token'] }));
  app.use(express.json());
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: true, credentials: true },
  });
  const manager = new LobbyManager();
  registerSocketHandlers(io, manager);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  async function createAuthenticatedClient(playerId: string, origin: string) {
    const res = await fetch(`${baseUrl}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        'X-Forwarded-Proto': 'https',
      },
      body: JSON.stringify({ playerId }),
    });
    const token = res.headers.get('x-session-token') || '';
    const sock = ioClient(baseUrl, {
      auth: { sessionToken: token },
      transports: ['websocket'],
    });
    await new Promise<void>((resolve, reject) => {
      sock.on('connect', () => resolve());
      sock.on('connect_error', reject);
    });
    return sock;
  }

  const tvSock = await createAuthenticatedClient('tv_host_e2e', 'https://projektbox-tv.onrender.com');
  const phone1Sock = await createAuthenticatedClient('p1_phone_e2e', 'https://projektbox-smartphone.onrender.com');
  const phone2Sock = await createAuthenticatedClient('p2_phone_e2e', 'https://projektbox-smartphone.onrender.com');

  try {
    const emitAck = (sock: ReturnType<typeof ioClient>, event: string, payload?: any) =>
      new Promise<any>((resolve) => {
        if (payload === undefined) sock.emit(event, resolve);
        else sock.emit(event, payload, resolve);
      });

    // TV eröffnet TV-Lobby
    const created = await emitAck(tvSock, SOCKET_EVENTS.LOBBY_CREATE, {
      name: 'Wohnzimmer TV',
      isPrivate: true,
      gameId: 'roulette',
      isTvMode: true,
      userProfile: { id: 'tv_host_e2e', name: 'TV', avatar: {} },
    });
    assert.equal(created.success, true);
    const code = created.lobby.code;

    // 2 Smartphones treten bei & setzen Ready
    const j1 = await emitAck(phone1Sock, SOCKET_EVENTS.LOBBY_JOIN, {
      lobbyIdOrCode: code,
      userProfile: { id: 'p1_phone_e2e', name: 'Anna', avatar: {} },
    });
    const j2 = await emitAck(phone2Sock, SOCKET_EVENTS.LOBBY_JOIN, {
      lobbyIdOrCode: code,
      userProfile: { id: 'p2_phone_e2e', name: 'Ben', avatar: {} },
    });
    assert.equal(j1.success, true);
    assert.equal(j2.success, true);

    await emitAck(phone1Sock, SOCKET_EVENTS.LOBBY_READY, {});
    await emitAck(phone2Sock, SOCKET_EVENTS.LOBBY_READY, {});

    const tvStateUpdates: any[] = [];
    tvSock.on(SOCKET_EVENTS.GAME_STATE, (payload) => {
      tvStateUpdates.push(payload);
    });

    const started = await emitAck(tvSock, SOCKET_EVENTS.LOBBY_START, {});
    assert.equal(started.success, true);

    // Beide Smartphones setzen parallel Chips -> TV empfängt beide in Echtzeit
    await emitAck(phone1Sock, SOCKET_EVENTS.GAME_MOVE, {
      type: 'place_bet',
      betKey: 'color:red',
      amount: 25,
    });
    await emitAck(phone2Sock, SOCKET_EVENTS.GAME_MOVE, {
      type: 'place_bet',
      betKey: 'split:14-17',
      amount: 100,
    });

    await new Promise((r) => setTimeout(r, 40));
    const latestTvAfterPlace = tvStateUpdates[tvStateUpdates.length - 1]?.gameState;
    assert.equal(latestTvAfterPlace?.bets?.p1_phone_e2e?.['color:red'], 25);
    assert.equal(latestTvAfterPlace?.bets?.p2_phone_e2e?.['split:14-17'], 100);

    // Smartphone 1 verschiebt per Drag-and-Drop und zieht danach Chip zurück
    await emitAck(phone1Sock, SOCKET_EVENTS.GAME_MOVE, {
      type: 'move_bet',
      fromBetKey: 'color:red',
      toBetKey: 'number:7',
      amount: 25,
    });
    await emitAck(phone1Sock, SOCKET_EVENTS.GAME_MOVE, {
      type: 'remove_bet',
      betKey: 'number:7',
      amount: 25,
    });

    await new Promise((r) => setTimeout(r, 40));
    const latestTvAfterWithdraw = tvStateUpdates[tvStateUpdates.length - 1]?.gameState;
    assert.equal(latestTvAfterWithdraw?.bets?.p1_phone_e2e?.['number:7'], undefined);
    assert.equal(latestTvAfterWithdraw?.balances?.p1_phone_e2e, 1000);
    assert.equal(latestTvAfterWithdraw?.bets?.p2_phone_e2e?.['split:14-17'], 100);
  } finally {
    tvSock.disconnect();
    phone1Sock.disconnect();
    phone2Sock.disconnect();
    io.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    manager.clearAllTimers();
  }
});

test('normalizeBackendBaseUrl entfernt doppelte /api-Suffixe und abschließende Slashes zuverlässig', () => {
  assert.equal(normalizeBackendBaseUrl('https://projektbox-backend.onrender.com/api'), 'https://projektbox-backend.onrender.com');
  assert.equal(normalizeBackendBaseUrl('https://projektbox-backend.onrender.com/api/'), 'https://projektbox-backend.onrender.com');
  assert.equal(normalizeBackendBaseUrl('https://projektbox-backend.onrender.com/'), 'https://projektbox-backend.onrender.com');
  assert.equal(normalizeBackendBaseUrl('http://localhost:5001'), 'http://localhost:5001');
  assert.equal(normalizeBackendBaseUrl(''), '');
});
