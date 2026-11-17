import test from 'node:test';
import assert from 'node:assert/strict';
import { LobbyManager } from './lobbyManager.js';
import { drawAndGuessGame } from '../games/definitions/drawAndGuess.js';
import { checkRateLimit, cleanupSocketRateLimit, consumeRateLimit } from '../utils/rateLimiter.js';
import {
  DrawStrokesSchema,
  EVENT_MAX_PAYLOAD_BYTES,
  GameMoveSchema,
  isPayloadWithinLimit,
  LobbyUpdateProfileSchema,
} from './socketSchemas.js';
import type { Player } from '../types/multiplayer.js';

const mockPlayers: Player[] = [
  {
    id: 'p1',
    socketId: 'sock_1',
    name: 'Alice',
    avatar: {},
    isReady: true,
    isHost: true,
    connected: true,
  },
  {
    id: 'p2',
    socketId: 'sock_2',
    name: 'Bob',
    avatar: {},
    isReady: true,
    isHost: false,
    connected: true,
  },
];

test('Draw & Guess: Punktevergabe, Rundenwechsel und Idempotenz bei next_round', () => {
  let state = drawAndGuessGame.initGameState(mockPlayers, 'p1', {
    rounds: 2,
    roundDuration: 60,
    hints: true,
    category: 'Tiere',
  });

  assert.equal(state.currentDrawerId, 'p1');
  const secret = state.secretWord;

  // Zeichner darf nicht selbst raten
  const drawerGuess = drawAndGuessGame.validateAndApplyMove({
    state,
    players: mockPlayers,
    playerId: 'p1',
    move: { type: 'guess', text: secret },
  });
  assert.equal(drawerGuess.valid, false);

  // Rater errät das Wort korrekt (case-insensitive)
  const correctGuess = drawAndGuessGame.validateAndApplyMove({
    state,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'guess', text: secret.toUpperCase() },
  });
  assert.equal(correctGuess.valid, true);
  assert.equal(correctGuess.state.scores.p2, 100);
  assert.equal(correctGuess.state.scores.p1, 50);
  assert.equal(correctGuess.state.roundStatus, 'round_over');

  // Nächste Runde starten
  const nextRoundRes = drawAndGuessGame.validateAndApplyMove({
    state: correctGuess.state,
    players: mockPlayers,
    playerId: 'p1',
    move: { type: 'next_round' },
  });
  assert.equal(nextRoundRes.valid, true);
  assert.equal(nextRoundRes.state.round, 2);
  assert.equal(nextRoundRes.state.currentDrawerId, 'p2');
  assert.equal(nextRoundRes.state.roundStatus, 'drawing');

  // Doppelter next_round Aufruf eines zweiten Clients ist idempotent (kein Fehler)
  const duplicateNext = drawAndGuessGame.validateAndApplyMove({
    state: nextRoundRes.state,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'next_round' },
  });
  assert.equal(duplicateNext.valid, true);
  assert.equal(duplicateNext.state.round, 2);
});

test('LobbyManager: Kompletter Lobby-Lifecycle, TV-Modus und Reconnect-Bereinigung', () => {
  const manager = new LobbyManager();

  const created = manager.createLobby({
    name: 'Test-Lobby',
    isPrivate: true,
    gameId: 'draw-and-guess',
    userProfile: { id: 'u1', name: 'HostPlayer', avatar: {} },
    socketId: 's1',
  });
  assert.ok(created.lobby);
  const code = created.lobby.code;

  // Zweiter Spieler tritt per Code bei
  const joined = manager.joinLobby({
    lobbyIdOrCode: code,
    userProfile: { id: 'u2', name: 'GuestPlayer', avatar: {} },
    socketId: 's2',
  });
  assert.ok(joined.lobby);
  assert.equal(joined.lobby.players.length, 2);

  // Gast schaltet auf Ready
  const readyRes = manager.toggleReady('s2');
  assert.equal(readyRes.lobby?.players[1].isReady, true);

  // Host startet das Spiel
  const started = manager.startGame('s1');
  assert.equal(started.lobby?.status, 'in-game');
  assert.ok(started.lobby?.gameState);

  // Reconnect aktualisiert socketId und bereinigt alte Zuordnung
  const recon = manager.reconnectPlayer({ userId: 'u2', socketId: 's2_new' });
  assert.ok(recon.lobby);
  assert.equal(manager.getLobbyBySocketId('s2'), undefined);
  assert.equal(manager.getLobbyBySocketId('s2_new')?.id, created.lobby.id);

  // Beide verlassen die Lobby -> Lobby wird automatisch gelöscht
  manager.leaveCurrentLobby('s1');
  const finalLeave = manager.leaveCurrentLobby('s2_new');
  assert.equal(finalLeave.deleted, true);
  assert.equal(manager.findLobbyByCode(code), undefined);
});

test('RateLimiter: Token-Bucket erlaubt Bursts, füllt kontinuierlich nach und begrenzt je Event', async () => {
  const testSocket = 'rate_test_socket';
  const t0 = 1_000_000;

  // lobby:update-profile: capacity 4, refill 0.5/s
  for (let i = 0; i < 4; i++) {
    assert.equal(checkRateLimit(testSocket, 'lobby:update-profile', t0), true);
  }
  assert.equal(checkRateLimit(testSocket, 'lobby:update-profile', t0), false);

  // Nach 2 Sekunden ist genau 1 Token nachgefüllt (2 * 0.5 = 1)
  assert.equal(checkRateLimit(testSocket, 'lobby:update-profile', t0 + 2000), true);
  assert.equal(checkRateLimit(testSocket, 'lobby:update-profile', t0 + 2000), false);

  // Anderes Event (draw:strokes) besitzt eigenen Bucket (capacity 45)
  for (let i = 0; i < 45; i++) {
    assert.equal(await consumeRateLimit(testSocket, 'draw:strokes', t0), true);
  }
  assert.equal(await consumeRateLimit(testSocket, 'draw:strokes', t0), false);

  cleanupSocketRateLimit(testSocket);
  assert.equal(checkRateLimit(testSocket, 'lobby:update-profile', t0), true);
  cleanupSocketRateLimit(testSocket);
});

test('SocketSchemas: Zod-Validierung und Payload-Größenlimits greifen zuverlässig', () => {
  assert.equal(
    DrawStrokesSchema.safeParse({
      strokes: [{ x0: 0.1, y0: 0.2, x1: 0.3, y1: 0.4, color: '#000000', size: 5 }],
    }).success,
    true
  );

  // Ungültige Koordinaten (> 1) oder > 120 Strokes ablehnen
  assert.equal(
    DrawStrokesSchema.safeParse({
      strokes: [{ x0: 2.5, y0: 0.2, x1: 0.3, y1: 0.4, color: '#000000', size: 5 }],
    }).success,
    false
  );

  // Ungültiges Custom-Avatar-Format ablehnen
  assert.equal(
    LobbyUpdateProfileSchema.safeParse({
      userProfile: { id: 'u1', name: 'Player', avatar: { customImage: 'https://evil.test/x.png' } },
    }).success,
    false
  );

  // GameMove discriminatedUnion
  assert.equal(GameMoveSchema.safeParse({ type: 'guess', text: 'APFEL' }).success, true);
  assert.equal(GameMoveSchema.safeParse({ type: 'guess', text: '' }).success, false);

  // Größenlimit prüfen
  const oversized = { text: 'X'.repeat(EVENT_MAX_PAYLOAD_BYTES['game:move'] + 100) };
  assert.equal(isPayloadWithinLimit(oversized, EVENT_MAX_PAYLOAD_BYTES['game:move']), false);
});
