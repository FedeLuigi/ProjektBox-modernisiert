import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { LobbyManager, sanitizeLobbyForClient } from './lobbyManager.js';
import { StatePersistenceStore } from './stateStore.js';
import { SESSION_COOKIE_NAME, parseCookieHeader } from '../session/sessionManager.js';
import { registerSocketHandlers } from './socketHandlers.js';
import { apiRouter } from '../routes/api.js';
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
    category: 'Tiere',
  });

  assert.equal(state.currentDrawerId, 'p1');
  assert.equal(state.wordLength, state.secretWord.length);
  assert.equal('wordHint' in state, false);
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
  assert.equal(started.lobby?.status, 'in_progress');
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

test('Draw & Guess: Eigene Wörter Option (An/Aus), Wort-Eingabe vor Zeichenstart und ohne Tipps', () => {
  const manager = new LobbyManager();
  const created = manager.createLobby({
    name: 'TestLobby',
    isPrivate: true,
    gameId: 'draw-and-guess',
    userProfile: { id: 'u1', name: 'Host', avatar: {} },
    socketId: 's1',
  });
  assert.equal(created.lobby?.settings?.customWordsEnabled, false);
  assert.equal('hints' in (created.lobby?.settings || {}), false);

  // Mit Eigene Wörter = AN startet die Runde in 'choosing_word'
  let state = drawAndGuessGame.initGameState(mockPlayers, 'p1', {
    rounds: 2,
    roundDuration: 45,
    customWordsEnabled: true,
  });
  assert.equal(state.customWordsEnabled, true);
  assert.equal(state.roundStatus, 'choosing_word');
  assert.equal(state.secretWord, '');
  assert.equal(state.wordLength, 0);

  // Rater darf weder raten noch ein Wort festlegen
  const guesserSet = drawAndGuessGame.validateAndApplyMove({
    state,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'set_word', word: 'Rakete' },
  });
  assert.equal(guesserSet.valid, false);

  const earlyGuess = drawAndGuessGame.validateAndApplyMove({
    state,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'guess', text: 'Rakete' },
  });
  assert.equal(earlyGuess.valid, false);

  // Ungültiges Wort mit Sonderzeichen/Leerzeichen wird abgewiesen
  const badWord = drawAndGuessGame.validateAndApplyMove({
    state,
    players: mockPlayers,
    playerId: 'p1',
    move: { type: 'set_word', word: 'Zwei Wörter!' },
  });
  assert.equal(badWord.valid, false);

  // Zeichner bestätigt sein eigenes Wort -> Spiel startet Zeichenphase mit voller Rundenzeit
  const confirmed = drawAndGuessGame.validateAndApplyMove({
    state,
    players: mockPlayers,
    playerId: 'p1',
    move: { type: 'set_word', word: 'SuperRakete' },
  });
  assert.equal(confirmed.valid, true);
  state = confirmed.state;
  assert.equal(state.roundStatus, 'drawing');
  assert.equal(state.secretWord, 'SuperRakete');
  assert.equal(state.wordLength, 11);
  assert.equal(state.categoryName, 'Eigene');

  // Rater errät das selbst eingegebene Wort
  const guessed = drawAndGuessGame.validateAndApplyMove({
    state,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'guess', text: 'superrakete' },
  });
  assert.equal(guessed.valid, true);
  assert.equal(guessed.state.scores.p2, 100);
  assert.equal(guessed.state.roundStatus, 'round_over');

  // Nächste Runde wechselt zu p2 und startet erneut mit 'choosing_word'
  const nextRound = drawAndGuessGame.validateAndApplyMove({
    state: guessed.state,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'next_round' },
  });
  assert.equal(nextRound.valid, true);
  assert.equal(nextRound.state.round, 2);
  assert.equal(nextRound.state.currentDrawerId, 'p2');
  assert.equal(nextRound.state.roundStatus, 'choosing_word');
  assert.equal(nextRound.state.secretWord, '');

  // Fallback: Wenn Zeichner beim Wählen nichts eingibt und time_up kommt -> Zufallswort startet Zeichenphase
  const timedOutChoose = drawAndGuessGame.validateAndApplyMove({
    state: nextRound.state,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'time_up' },
  });
  assert.equal(timedOutChoose.valid, true);
  assert.equal(timedOutChoose.state.roundStatus, 'drawing');
  assert.ok(timedOutChoose.state.secretWord.length >= 2);
  assert.equal(timedOutChoose.state.wordLength, timedOutChoose.state.secretWord.length);
});

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('Szenario 1 & 2: 5s und 30s Verbindungsabbruch behalten Spieler, pausieren ggf. Spiel und synchronisieren Zustand', () => {
  const manager = new LobbyManager({
    reconnectGraceMs: 60_000,
    hostTransferGraceMs: 20_000,
  });

  const s1 = manager.sessionManager.createSession('u_host').session;
  const s2 = manager.sessionManager.createSession('u_guest').session;

  const created = manager.createLobby({
    name: 'ReconnectLobby',
    isPrivate: true,
    gameId: 'draw-and-guess',
    userProfile: { id: 'u_host', name: 'Host', avatar: {} },
    socketId: 'sock_host_1',
    sessionId: s1.sessionId,
  });
  assert.equal(created.success, true);

  const joined = manager.joinLobby({
    lobbyIdOrCode: created.lobby!.code,
    userProfile: { id: 'u_guest', name: 'Guest', avatar: {} },
    socketId: 'sock_guest_1',
    sessionId: s2.sessionId,
  });
  assert.equal(joined.success, true);
  let guestToken = joined.reconnectToken!;

  manager.toggleReady({ lobbyId: created.lobby!.id, playerId: 'u_guest' });
  const started = manager.startGame({ lobbyId: created.lobby!.id, playerId: 'u_host' });
  assert.equal(started.lobby?.status, 'in_progress');
  const secretWord = started.lobby!.gameState!.secretWord;

  // Gast rät einmal nicht, Host bleibt verbunden; danach Trennung für simulierte 5s -> Lobby pausiert (da < minPlayers verbunden)
  const realNow = Date.now;
  let fakeNow = realNow();
  Date.now = () => fakeNow;

  try {
    const disc5 = manager.handleDisconnect('sock_guest_1');
    assert.equal(disc5.player?.connectionState, 'disconnected');
    assert.equal(disc5.lobby?.status, 'paused');
    assert.equal(disc5.lobby?.players.length, 2);
    assert.ok(disc5.player?.reconnectDeadline === fakeNow + 60_000);

    // 5 Sekunden später: Rückkehr innerhalb der 60s-Frist
    fakeNow += 5_000;
    const rec5 = manager.reconnectPlayer({
      socketId: 'sock_guest_2',
      userId: 'u_guest',
      sessionId: s2.sessionId,
      reconnectToken: guestToken,
    });
    assert.equal(rec5.success, true);
    assert.equal(rec5.lobby?.status, 'in_progress');
    assert.equal(rec5.lobby?.players.length, 2);
    assert.equal(rec5.player?.connectionState, 'connected');
    guestToken = rec5.reconnectToken!;

    // 30 Sekunden Verbindungsabbruch ebenfalls noch innerhalb der 60s-Frist
    const disc30 = manager.handleDisconnect('sock_guest_2');
    assert.equal(disc30.lobby?.status, 'paused');
    fakeNow += 30_000;

    const rec30 = manager.reconnectPlayer({
      socketId: 'sock_guest_3',
      userId: 'u_guest',
      sessionId: s2.sessionId,
      reconnectToken: guestToken,
    });
    assert.equal(rec30.success, true);
    assert.equal(rec30.lobby?.status, 'in_progress');
    assert.equal(rec30.lobby?.gameState?.secretWord, secretWord);
  } finally {
    Date.now = realNow;
    manager.clearAllTimers();
  }
});

test('Szenario 3: Nach Ablauf der 60s Reconnect-Frist wird Spieler offline gesetzt und Spiel läuft bei >= 2 aktiven weiter', async () => {
  const manager = new LobbyManager({
    reconnectGraceMs: 40, // Kurze Frist im Test entspricht abgelaufenen 60s
    hostTransferGraceMs: 30,
  });

  const s1 = manager.sessionManager.createSession('u1').session;
  const s2 = manager.sessionManager.createSession('u2').session;
  const s3 = manager.sessionManager.createSession('u3').session;

  const created = manager.createLobby({
    name: 'ThreePlayerLobby',
    isPrivate: true,
    gameId: 'draw-and-guess',
    userProfile: { id: 'u1', name: 'P1', avatar: {} },
    socketId: 's1',
    sessionId: s1.sessionId,
  });
  const lobbyId = created.lobby!.id;

  const j2 = manager.joinLobby({
    lobbyIdOrCode: lobbyId,
    userProfile: { id: 'u2', name: 'P2', avatar: {} },
    socketId: 's2',
    sessionId: s2.sessionId,
  });
  manager.joinLobby({
    lobbyIdOrCode: lobbyId,
    userProfile: { id: 'u3', name: 'P3', avatar: {} },
    socketId: 's3',
    sessionId: s3.sessionId,
  });

  manager.toggleReady('s2');
  manager.toggleReady('s3');
  manager.startGame('s1');

  // P3 sammelt 100 Punkte vor dem Verbindungsabbruch von P2
  const lobbyAfterStart = manager.getLobbyById(lobbyId)!;
  const word = lobbyAfterStart.gameState!.secretWord;
  const guessRes = manager.makeMove({
    lobbyId,
    playerId: 'u3',
    move: { type: 'guess', text: word },
    actionId: 'act_score_p3',
  });
  assert.equal(guessRes.success, true);
  assert.equal(guessRes.lobby?.gameState?.scores?.u3, 100);

  // P2 verliert Verbindung und kehrt erst nach Fristablauf (> 40ms) zurück
  manager.handleDisconnect('s2');
  await waitMs(80);

  const afterExpiry = manager.getLobbyById(lobbyId)!;
  const expiredP2 = afterExpiry.players.find((p) => p.id === 'u2');
  assert.equal(expiredP2?.connectionState, 'offline');
  assert.equal(expiredP2?.eliminated, true);
  // Spiel läuft weiter, da u1 und u3 noch aktiv sind, und Punktestände bleiben erhalten
  assert.equal(afterExpiry.status, 'in_progress');
  assert.equal(afterExpiry.gameState?.scores?.u3, 100);

  // Alter Reconnect-Versuch von u2 mit seinem Token wird abgewiesen
  const lateReconnect = manager.reconnectPlayer({
    socketId: 's2_late',
    userId: 'u2',
    sessionId: s2.sessionId,
    reconnectToken: j2.reconnectToken,
  });
  assert.equal(lateReconnect.success, false);

  manager.clearAllTimers();
});

test('Szenario 4 & 5: Browser-Refresh (neue socketId vor altem disconnect) und Tab schließen/öffnen über HttpOnly Session', () => {
  const manager = new LobbyManager({ reconnectGraceMs: 60_000 });
  const { session, rawSessionToken } = manager.sessionManager.createSession('u_browser');
  const sHost = manager.sessionManager.createSession('u_host_b').session;

  const created = manager.createLobby({
    name: 'RefreshLobby',
    isPrivate: true,
    gameId: 'draw-and-guess',
    userProfile: { id: 'u_host_b', name: 'HostB', avatar: {} },
    socketId: 'sock_host_b',
    sessionId: sHost.sessionId,
  });

  manager.joinLobby({
    lobbyIdOrCode: created.lobby!.code,
    userProfile: { id: 'u_browser', name: 'Refresher', avatar: {} },
    socketId: 'sock_tab_1',
    sessionId: session.sessionId,
  });
  manager.toggleReady('sock_tab_1');
  manager.startGame('sock_host_b');

  // Szenario 4: Refresh - neuer Socket verbindet sich per Session-Cookie noch bevor der alte FIN ankommt
  const fastReconnect = manager.reconnectPlayer({
    socketId: 'sock_tab_2',
    sessionId: session.sessionId,
  });
  assert.equal(fastReconnect.success, true);
  assert.equal(fastReconnect.supersededSocketId, 'sock_tab_1');
  assert.equal(fastReconnect.lobby?.players.length, 2);

  // Veraltetes Disconnect-Event vom geschlossenen Socket darf den neuen Socket nicht auf disconnected setzen!
  const staleDisc = manager.handleDisconnect('sock_tab_1');
  assert.equal(staleDisc.ignoredStaleSocket, true);
  const currentPlayer = manager
    .getLobbyById(created.lobby!.id)!
    .players.find((p) => p.id === 'u_browser');
  assert.equal(currentPlayer?.connected, true);
  assert.equal(currentPlayer?.socketId, 'sock_tab_2');

  // Szenario 5: Tab schließen (Disconnect, RAM-Token verloren) und neuen Tab mit HttpOnly-Cookie öffnen
  manager.handleDisconnect('sock_tab_2');
  const verifiedCookie = manager.sessionManager.verifySessionToken(rawSessionToken);
  assert.equal(verifiedCookie.valid, true);
  const reopenTab = manager.reconnectPlayer({
    socketId: 'sock_tab_reopened',
    sessionId: verifiedCookie.session!.sessionId,
  });
  assert.equal(reopenTab.success, true);
  assert.equal(reopenTab.player?.connected, true);
  assert.equal(reopenTab.lobby?.players.length, 2);
  assert.equal(reopenTab.lobby?.status, 'in_progress');

  manager.clearAllTimers();
});

test('Szenario 6: Host verliert Verbindung -> kurzzeitiger Erhalt, danach automatischer Host-Wechsel mit Berechtigungsschutz', async () => {
  const manager = new LobbyManager({
    reconnectGraceMs: 500,
    hostTransferGraceMs: 40,
  });
  let hostChangeNotified = '';
  manager.setCallbacks({
    onHostChanged(_lobby, newHost) {
      hostChangeNotified = newHost.id;
    },
  });

  const s1 = manager.sessionManager.createSession('u_host').session;
  const s2 = manager.sessionManager.createSession('u_guest').session;

  const created = manager.createLobby({
    name: 'HostFailoverLobby',
    isPrivate: true,
    gameId: 'draw-and-guess',
    userProfile: { id: 'u_host', name: 'OriginalHost', avatar: {} },
    socketId: 's_host',
    sessionId: s1.sessionId,
  });
  const lobbyId = created.lobby!.id;

  manager.joinLobby({
    lobbyIdOrCode: lobbyId,
    userProfile: { id: 'u_guest', name: 'NewHost', avatar: {} },
    socketId: 's_guest',
    sessionId: s2.sessionId,
  });

  // Solange OriginalHost noch als Host gilt (während Frist), darf u_guest keine Settings ändern
  const preTransferSettings = manager.updateSettings({
    lobbyId,
    playerId: 'u_guest',
    settings: { rounds: 5 },
  });
  assert.equal(preTransferSettings.success, false);

  // Host verliert Verbindung -> Lobby wird NICHT gelöscht, Host bleibt kurz erhalten
  manager.handleDisconnect('s_host');
  assert.ok(manager.getLobbyById(lobbyId));
  assert.equal(manager.getLobbyById(lobbyId)?.hostId, 'u_host');

  // Nach Ablauf der Host-Ausfall-Frist geht die Host-Rolle automatisch auf u_guest über
  await waitMs(70);
  const afterTransfer = manager.getLobbyById(lobbyId)!;
  assert.equal(afterTransfer.hostId, 'u_guest');
  assert.equal(hostChangeNotified, 'u_guest');

  // Neuer Host darf Einstellungen ändern, alter Host (selbst bei Rückkehr) nicht mehr
  const allowed = manager.updateSettings({
    lobbyId,
    playerId: 'u_guest',
    settings: { rounds: 4 },
  });
  assert.equal(allowed.success, true);
  assert.equal(allowed.lobby?.settings?.rounds, 4);

  const deniedOldHost = manager.updateSettings({
    lobbyId,
    playerId: 'u_host',
    settings: { rounds: 10 },
  });
  assert.equal(deniedOldHost.success, false);

  manager.clearAllTimers();
});

test('Szenario 7 & 8: Backend-Neustart & Render-Deployment stellen laufendes Spiel, Cookie-Session und Ergebnisse wieder her', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'projektbox-state-'));
  const stateFile = path.join(tmpDir, 'state.json');

  let manager1: LobbyManager | undefined;
  let manager2: LobbyManager | undefined;
  let store3: StatePersistenceStore | undefined;

  try {
    // Instanz 1 (vor Neustart / Render-Deploy)
    const store1 = new StatePersistenceStore({ filePath: stateFile });
    manager1 = new LobbyManager({
      stateStore: store1,
      reconnectGraceMs: 60_000,
    });
    await manager1.init();

    const { session: sess1, rawSessionToken: cookieToken1 } =
      manager1.sessionManager.createSession('u_r1');
    const { session: sess2, rawSessionToken: cookieToken2 } =
      manager1.sessionManager.createSession('u_r2');

    const created = manager1.createLobby({
      name: 'RenderRestartLobby',
      isPrivate: false,
      gameId: 'draw-and-guess',
      userProfile: { id: 'u_r1', name: 'Alice', avatar: {} },
      socketId: 's_r1',
      sessionId: sess1.sessionId,
    });
    const lobbyId = created.lobby!.id;
    manager1.joinLobby({
      lobbyIdOrCode: lobbyId,
      userProfile: { id: 'u_r2', name: 'Bob', avatar: {} },
      socketId: 's_r2',
      sessionId: sess2.sessionId,
    });
    manager1.toggleReady('s_r2');
    manager1.startGame({ lobbyId, playerId: 'u_r1' });

    const activeWord = manager1.getLobbyById(lobbyId)!.gameState!.secretWord;
    manager1.makeMove({
      lobbyId,
      playerId: 'u_r2',
      move: { type: 'guess', text: activeWord },
      actionId: 'act_render_win_round',
    });

    await store1.flush();
    await manager1.shutdown();
    manager1 = undefined;

    // Instanz 2 startet nach Deployment mit leerem RAM, lädt Zustand aus persistiertem Store
    const store2 = new StatePersistenceStore({ filePath: stateFile });
    manager2 = new LobbyManager({
      stateStore: store2,
      reconnectGraceMs: 60_000,
    });
    const restored = await manager2.init();
    assert.equal(restored.restoredLobbies, 1);
    assert.equal(restored.restoredSessions, 2);

    const pausedLobby = manager2.getLobbyById(lobbyId)!;
    assert.equal(pausedLobby.status, 'paused');
    assert.equal(pausedLobby.gameState?.scores?.u_r2, 100);
    assert.ok(pausedLobby.players.every((p) => p.connectionState === 'disconnected'));

    // Beide Spieler reconnecten automatisch per HttpOnly-Session-Token gegen Instanz 2
    const v1 = manager2.sessionManager.verifySessionToken(cookieToken1);
    const v2 = manager2.sessionManager.verifySessionToken(cookieToken2);
    assert.equal(v1.valid, true);
    assert.equal(v2.valid, true);

    const rec1 = manager2.reconnectPlayer({
      socketId: 's_r1_after',
      sessionId: v1.session!.sessionId,
    });
    assert.equal(rec1.success, true);
    assert.equal(rec1.lobby?.status, 'paused'); // Noch ein Spieler ausstehend

    const rec2 = manager2.reconnectPlayer({
      socketId: 's_r2_after',
      sessionId: v2.session!.sessionId,
    });
    assert.equal(rec2.success, true);
    assert.equal(rec2.lobby?.status, 'in_progress');
    assert.equal(rec2.lobby?.gameState?.scores?.u_r2, 100);

    // Beende alle verbleibenden Runden sauber über den jeweiligen Zeichner bis zum Spielende
    const maxRounds = rec2.lobby!.settings?.rounds || 3;
    for (let r = 2; r <= maxRounds; r++) {
      manager2.makeMove({ lobbyId, playerId: 'u_r1', move: { type: 'next_round' } });
      const currentDrawerId = manager2.getLobbyById(lobbyId)!.gameState!.currentDrawerId;
      manager2.makeMove({ lobbyId, playerId: currentDrawerId, move: { type: 'time_up' } });
    }
    manager2.makeMove({ lobbyId, playerId: 'u_r1', move: { type: 'next_round' } });

    const finishedLobby = manager2.getLobbyById(lobbyId)!;
    assert.equal(finishedLobby.status, 'finished');
    await store2.flush();
    await manager2.shutdown();
    manager2 = undefined;

    store3 = new StatePersistenceStore({ filePath: stateFile });
    await store3.init();
    const loadedSnapshot = await store3.loadSnapshot();
    assert.ok(loadedSnapshot);
    assert.equal(loadedSnapshot.completedResults.length, 1);
    assert.equal(loadedSnapshot.completedResults[0].winnerId, 'u_r2');
    assert.equal(loadedSnapshot.completedResults[0].scores?.u_r2, 100);
    await store3.close();
    store3 = undefined;
  } finally {
    await manager1?.shutdown();
    await manager2?.shutdown();
    await store3?.close();
    await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
});

test('Szenario 9 & 10: Doppelte Session-Nutzung, Impersonation-Schutz und Ablehnung alter Reconnect-Tokens', async () => {
  const manager = new LobbyManager();
  const { session: sessAlice } = manager.sessionManager.createSession('u_alice');
  const { session: sessMallory } = manager.sessionManager.createSession('u_mallory');

  const created = manager.createLobby({
    name: 'SecLobby',
    isPrivate: true,
    gameId: 'draw-and-guess',
    userProfile: { id: 'u_alice', name: 'Alice', avatar: {} },
    socketId: 'sock_alice_1',
    sessionId: sessAlice.sessionId,
  });
  const token1 = created.reconnectToken!;

  // Szenario 9a: Mallory versucht, sich mit Alices User-ID einzuloggen -> blockiert
  const spoofJoin = manager.joinLobby({
    lobbyIdOrCode: created.lobby!.code,
    userProfile: { id: 'u_alice', name: 'FakeAlice', avatar: {} },
    socketId: 'sock_mallory',
    sessionId: sessMallory.sessionId,
  });
  assert.equal(spoofJoin.success, false);
  assert.equal(created.lobby!.players.length, 1);

  // Szenario 9b: Zweiter Tab/Client nutzt dieselbe Session -> kein doppelter Spieler, erster Socket wird abgelöst
  const recValid = manager.reconnectPlayer({
    socketId: 'sock_alice_2',
    sessionId: sessAlice.sessionId,
    reconnectToken: token1,
  });
  assert.equal(recValid.success, true);
  assert.equal(recValid.supersededSocketId, 'sock_alice_1');
  assert.equal(recValid.lobby?.players.length, 1);
  const token2 = recValid.reconnectToken!;
  assert.notEqual(token2, token1);

  // Szenario 10: Alter Reconnect-Token (token1) wird erneut verwendet -> strikt abgelehnt
  const reuseOldToken = manager.reconnectPlayer({
    socketId: 'sock_replay',
    sessionId: sessAlice.sessionId,
    reconnectToken: token1,
  });
  assert.equal(reuseOldToken.success, false);
  assert.match(reuseOldToken.error || '', /wiederverwendet/i);

  // HTTP /api/session prüft HttpOnly, SameSite=Lax, keinen Token im JSON und schützt gegen User-ID-Übernahme
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  const server = http.createServer(app);
  const io = new SocketIOServer(server);
  registerSocketHandlers(io, manager);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const addr = server.address() as { port: number };
    const res = await fetch(`http://127.0.0.1:${addr.port}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: 'u_new_client' }),
    });
    assert.equal(res.status, 200);
    const setCookieHeader = res.headers.get('set-cookie') || '';
    assert.ok(setCookieHeader.includes(`${SESSION_COOKIE_NAME}=`));
    assert.ok(setCookieHeader.includes('HttpOnly'));
    assert.ok(setCookieHeader.includes('SameSite=Lax'));
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.authenticated, true);
    assert.equal('rawSessionToken' in body, false);
    assert.equal('token' in body, false);
    const parsedCookies = parseCookieHeader(setCookieHeader.split(';')[0]);
    assert.ok(parsedCookies[SESSION_COOKIE_NAME]);
  } finally {
    io.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    manager.clearAllTimers();
  }
});

test('Szenario 11 & 12: Idempotenz bei doppelten Spielzügen und Verbot fremder Lobby-Zugriffe', () => {
  const manager = new LobbyManager();
  const sA1 = manager.sessionManager.createSession('u_a1').session;
  const sA2 = manager.sessionManager.createSession('u_a2').session;
  const sB1 = manager.sessionManager.createSession('u_b1').session;

  const lobbyA = manager.createLobby({
    name: 'LobbyA',
    isPrivate: true,
    gameId: 'draw-and-guess',
    userProfile: { id: 'u_a1', name: 'A1', avatar: {} },
    socketId: 'sa1',
    sessionId: sA1.sessionId,
  }).lobby!;
  manager.joinLobby({
    lobbyIdOrCode: lobbyA.id,
    userProfile: { id: 'u_a2', name: 'A2', avatar: {} },
    socketId: 'sa2',
    sessionId: sA2.sessionId,
  });
  manager.toggleReady('sa2');
  manager.startGame({ lobbyId: lobbyA.id, playerId: 'u_a1', actionId: 'act_start_a' });

  const lobbyB = manager.createLobby({
    name: 'LobbyB',
    isPrivate: true,
    gameId: 'draw-and-guess',
    userProfile: { id: 'u_b1', name: 'B1', avatar: {} },
    socketId: 'sb1',
    sessionId: sB1.sessionId,
  }).lobby!;

  const word = manager.getLobbyById(lobbyA.id)!.gameState!.secretWord;

  // Szenario 11: Gleiche actionId zweimal senden -> Punkte nur EINMAL vergeben
  const m1 = manager.makeMove({
    lobbyId: lobbyA.id,
    playerId: 'u_a2',
    move: { type: 'guess', text: word },
    actionId: 'act_guess_once',
  });
  assert.equal(m1.success, true);
  assert.equal(m1.duplicate, undefined);
  assert.equal(m1.lobby?.gameState?.scores?.u_a2, 100);
  const versionAfterMove = m1.lobby!.stateVersion;

  const m2 = manager.makeMove({
    lobbyId: lobbyA.id,
    playerId: 'u_a2',
    move: { type: 'guess', text: word },
    actionId: 'act_guess_once',
  });
  assert.equal(m2.success, true);
  assert.equal(m2.duplicate, true);
  assert.equal(m2.lobby?.gameState?.scores?.u_a2, 100);
  assert.equal(m2.lobby?.stateVersion, versionAfterMove);

  // Veraltete erwartete stateVersion für next_round wird abgelehnt
  const staleMove = manager.makeMove({
    lobbyId: lobbyA.id,
    playerId: 'u_a1',
    move: { type: 'next_round' },
    expectedVersion: Math.max(0, versionAfterMove - 2),
  });
  assert.equal(staleMove.success, false);

  // Szenario 12: Spieler aus Lobby A versucht Zugriff / Reconnect in fremde Lobby B
  const hijackLobbyB = manager.reconnectPlayer({
    socketId: 'sa2_hijack',
    sessionId: sA2.sessionId,
    lobbyIdOrCode: lobbyB.id,
  });
  assert.equal(hijackLobbyB.success, false);

  const foreignMove = manager.makeMove({
    lobbyId: lobbyB.id,
    playerId: 'u_a2',
    move: { type: 'time_up' },
  });
  assert.equal(foreignMove.success, false);

  // Sanitized Lobby gibt keine internen sessionIds an Clients weiter
  const safeA = sanitizeLobbyForClient(lobbyA);
  assert.equal('sessionId' in safeA.players[0], false);
  assert.equal(safeA.processedActionIds, undefined);

  manager.clearAllTimers();
});

test('Moduswechsel Standard <-> TV Screen funktioniert wiederholt ohne Lobby-Neuerstellung oder Rate-Limit', () => {
  const manager = new LobbyManager();
  const s1 = manager.sessionManager.createSession('u_switch').session;

  const created = manager.createLobby({
    name: 'SwitchLobby',
    isPrivate: true,
    gameId: 'draw-and-guess',
    userProfile: { id: 'u_switch', name: 'Switcher', avatar: {} },
    socketId: 's_switch',
    isTvMode: false,
    sessionId: s1.sessionId,
  });
  assert.equal(created.success, true);
  const originalLobbyId = created.lobby!.id;
  const originalCode = created.lobby!.code;

  for (let i = 0; i < 6; i++) {
    const nextTv = i % 2 === 0;
    const res = manager.switchLobbyMode({
      lobbyId: originalLobbyId,
      playerId: 'u_switch',
      isTvMode: nextTv,
      actionId: `act_switch_${i}`,
    });
    assert.equal(res.success, true);
    assert.equal(res.lobby?.id, originalLobbyId);
    assert.equal(res.lobby?.code, originalCode);
    assert.equal(res.lobby?.isTvMode, nextTv);
    assert.equal(res.lobby?.players[0]?.isTvScreen, nextTv);
  }

  for (let i = 0; i < 8; i++) {
    assert.equal(checkRateLimit('switch_rate_sock', 'lobby:switch-mode', 10_000 + i), true);
    assert.equal(checkRateLimit('switch_rate_sock', 'lobby:create', 10_000 + i), true);
  }
  cleanupSocketRateLimit('switch_rate_sock');

  manager.clearAllTimers();
});
