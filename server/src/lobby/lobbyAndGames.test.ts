import test from 'node:test';
import assert from 'node:assert/strict';
import { LobbyManager } from './lobbyManager.js';
import { drawAndGuessGame } from '../games/definitions/drawAndGuess.js';
import { checkRateLimit, cleanupSocketRateLimit } from '../utils/rateLimiter.js';
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

test('RateLimiter: erlaubt normale Last und blockiert Spam-Bursts', () => {
  const testSocket = 'rate_test_socket';
  for (let i = 0; i < 12; i++) {
    assert.equal(checkRateLimit(testSocket), true);
  }
  assert.equal(checkRateLimit(testSocket), false);
  cleanupSocketRateLimit(testSocket);
  assert.equal(checkRateLimit(testSocket), true);
  cleanupSocketRateLimit(testSocket);
});
