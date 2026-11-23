import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { LobbyManager, sanitizeLobbyForClient } from './lobbyManager.js';
import { SimulationBotRunner } from './simulationBotRunner.js';
import { StatePersistenceStore } from './stateStore.js';
import { SESSION_COOKIE_NAME, parseCookieHeader } from '../session/sessionManager.js';
import { registerSocketHandlers } from './socketHandlers.js';
import { apiRouter } from '../routes/api.js';
import { DRAW_AND_GUESS_WORDS, drawAndGuessGame } from '../games/definitions/drawAndGuess.js';
import {
  doesBetWin,
  getBetPayoutMultiplier,
  isValidBetKey,
  rouletteGame,
  type RouletteState,
} from '../games/definitions/roulette.js';
import { evaluateBestPokerHand, type PokerCard } from '../games/definitions/pokerEvaluator.js';
import { texasHoldemGame, type TexasHoldemState } from '../games/definitions/texasHoldem.js';
import { stadtLandFlussGame } from '../games/definitions/stadtLandFluss.js';
import { checkRateLimit, cleanupSocketRateLimit, consumeRateLimit } from '../utils/rateLimiter.js';
import {
  DrawStrokesSchema,
  EVENT_MAX_PAYLOAD_BYTES,
  GameMoveSchema,
  isPayloadWithinLimit,
  LobbySimulateSchema,
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

  // Alle Wörter im Wortschatz sind eindeutig und enthalten nur saubere Buchstaben ohne Bindestrich oder Sonderzeichen
  assert.ok(DRAW_AND_GUESS_WORDS.length >= 200);
  const seenWords = new Set<string>();
  for (const entry of DRAW_AND_GUESS_WORDS) {
    assert.match(
      entry.word,
      /^[a-zA-ZäöüÄÖÜ]{2,20}$/,
      `Ungültige Zeichen im Wort: ${entry.word}`
    );
    const key = entry.word.toLowerCase();
    assert.equal(seenWords.has(key), false, `Doppeltes Wort: ${entry.word}`);
    seenWords.add(key);
  }
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

test('Stadt, Land, Fluss: Kategorien-Wertung (20/10/5/0), Stopp-Knopf, Veto-Abstimmung sowie TV- und Spieler-Flow', () => {
  const manager = new LobbyManager();
  const sHost = manager.sessionManager.createSession('u_slf1').session;
  const sGuest = manager.sessionManager.createSession('u_slf2').session;

  // 1) Nur-Spieler-Modus (ohne TV): Anna & Ben spielen direkt
  const created = manager.createLobby({
    name: 'SLF-Runde',
    isPrivate: true,
    gameId: 'stadt-land-fluss',
    userProfile: { id: 'u_slf1', name: 'Anna', avatar: {} },
    socketId: 'slf_sock1',
    isTvMode: false,
    sessionId: sHost.sessionId,
  });
  assert.equal(created.success, true);
  assert.equal(created.lobby?.settings?.stopButtonEnabled, true);
  assert.equal(created.lobby?.settings?.categoryPreset, 'klassisch');

  const lobbyId = created.lobby!.id;
  manager.updateSettings({
    lobbyId,
    playerId: 'u_slf1',
    settings: { rounds: 1, roundDuration: 60, stopButtonEnabled: true, categoryPreset: 'klassisch' },
  });

  manager.joinLobby({
    lobbyIdOrCode: lobbyId,
    userProfile: { id: 'u_slf2', name: 'Ben', avatar: {} },
    socketId: 'slf_sock2',
    sessionId: sGuest.sessionId,
  });
  manager.toggleReady('slf_sock2');
  const started = manager.startGame('slf_sock1');
  assert.equal(started.success, true);
  assert.equal(started.lobby?.status, 'in_progress');

  const gs0 = started.lobby!.gameState as any;
  assert.equal(gs0.phase, 'writing');
  const L = gs0.letter as string;

  // Entwurf speichern aktualisiert filledCounts live für Mitspieler
  const draftBen = manager.makeMove({
    lobbyId,
    playerId: 'u_slf2',
    move: {
      type: 'save_draft',
      answers: {
        Stadt: `${L}berlin`,
        Land: `${L}belgien`,
        Fluss: '',
        Tier: '',
        Name: '',
      },
    },
  });
  assert.equal(draftBen.success, true);
  assert.equal((draftBen.lobby?.gameState as any).filledCounts.u_slf2, 2);

  // Stopp darf NICHT ausgelöst werden solange nicht alle 5 Kategorien ausgefüllt sind
  const invalidStop = manager.makeMove({
    lobbyId,
    playerId: 'u_slf1',
    move: {
      type: 'submit_round',
      answers: { Stadt: `${L}stadtx` },
      triggerStop: true,
    },
  });
  assert.equal(invalidStop.success, false);

  const wrongStart = L === 'Z' ? 'A' : 'Z';
  const annaStop = manager.makeMove({
    lobbyId,
    playerId: 'u_slf1',
    move: {
      type: 'submit_round',
      answers: {
        Stadt: `${L}berlin`, // doppelt mit Ben (+5)
        Land: `${L}spanien`, // einzigartig während Ben belgium hat (+10)
        Fluss: `${L}fluss`, // Solo (+20, Ben hat leer)
        Tier: `${wrongStart}tier`, // falscher Buchstabe -> 0 Punkte!
        Name: `${L}anna`, // Solo (+20)
      },
      triggerStop: true,
    },
  });
  assert.equal(annaStop.success, true);
  const reviewState = annaStop.lobby!.gameState as any;
  assert.equal(reviewState.phase, 'review');
  assert.equal(reviewState.stoppedByPlayerName, 'Anna');
  assert.equal(reviewState.evaluated.Stadt.u_slf1.points, 5);
  assert.equal(reviewState.evaluated.Stadt.u_slf2.points, 5);
  assert.equal(reviewState.evaluated.Land.u_slf1.points, 10);
  assert.equal(reviewState.evaluated.Land.u_slf2.points, 10);
  assert.equal(reviewState.evaluated.Fluss.u_slf1.points, 20);
  assert.equal(reviewState.evaluated.Fluss.u_slf2.points, 0);
  assert.equal(reviewState.evaluated.Tier.u_slf1.points, 0);
  assert.equal(reviewState.evaluated.Tier.u_slf1.valid, false);

  // Veto: Ben streicht Annas 'Name'-Antwort -> Anna verliert die 20 Punkte sofort live!
  assert.equal(reviewState.evaluated.Name.u_slf1.points, 20);
  const vetoRes = manager.makeMove({
    lobbyId,
    playerId: 'u_slf2',
    move: { type: 'toggle_vote', targetPlayerId: 'u_slf1', category: 'Name' },
  });
  assert.equal(vetoRes.success, true);
  const afterVeto = vetoRes.lobby!.gameState as any;
  assert.equal(afterVeto.evaluated.Name.u_slf1.rejected, true);
  assert.equal(afterVeto.evaluated.Name.u_slf1.points, 0);

  // Beide bestätigen Auswertung -> 'round_over' -> 'next_round' -> Spielende ('finished')
  manager.makeMove({ lobbyId, playerId: 'u_slf1', move: { type: 'review_ready' } });
  const roundOver = manager.makeMove({ lobbyId, playerId: 'u_slf2', move: { type: 'review_ready' } });
  assert.equal((roundOver.lobby?.gameState as any).phase, 'round_over');

  const gameFinished = manager.makeMove({ lobbyId, playerId: 'u_slf1', move: { type: 'next_round' } });
  assert.equal(gameFinished.lobby?.status, 'finished');
  assert.equal((gameFinished.lobby?.gameState as any).phase, 'game_over');
  assert.equal(gameFinished.lobby?.gameState?.winnerId, 'u_slf1'); // 35 vs 15 Punkte

  // 2) TV-Modus mit 1 TV + 2 Smartphones starten
  const sTv = manager.sessionManager.createSession('u_tv').session;
  const sP1 = manager.sessionManager.createSession('u_p1').session;
  const sP2 = manager.sessionManager.createSession('u_p2').session;
  const tvLobby = manager.createLobby({
    name: 'SLF-TV',
    isPrivate: true,
    gameId: 'stadt-land-fluss',
    userProfile: { id: 'u_tv', name: 'TV', avatar: {} },
    socketId: 'tv_s',
    isTvMode: true,
    sessionId: sTv.sessionId,
  }).lobby!;
  manager.joinLobby({
    lobbyIdOrCode: tvLobby.id,
    userProfile: { id: 'u_p1', name: 'P1', avatar: {} },
    socketId: 'p1_s',
    sessionId: sP1.sessionId,
  });
  manager.joinLobby({
    lobbyIdOrCode: tvLobby.id,
    userProfile: { id: 'u_p2', name: 'P2', avatar: {} },
    socketId: 'p2_s',
    sessionId: sP2.sessionId,
  });
  manager.toggleReady('p1_s');
  manager.toggleReady('p2_s');
  const tvStarted = manager.startGame('tv_s');
  assert.equal(tvStarted.success, true);
  assert.equal(tvStarted.lobby?.isTvMode, true);
  assert.equal((tvStarted.lobby?.gameState as any).phase, 'writing');

  // 3) Direkter Check auf onPlayerLeave bei 3 Spielern: Spiel läuft weiter und geht bei Bedarf in 'review'
  const threePlayers: Player[] = [
    ...mockPlayers,
    { id: 'p3', socketId: 'sock_3', name: 'Clara', avatar: {}, isReady: true, isHost: false, connected: true },
  ];
  let s3 = stadtLandFlussGame.initGameState(threePlayers, 'p1', { rounds: 2 });
  s3 = stadtLandFlussGame.validateAndApplyMove({
    state: s3,
    players: threePlayers,
    playerId: 'p1',
    move: { type: 'submit_round', answers: { Stadt: `${s3.letter}a` } },
  }).state;
  s3 = stadtLandFlussGame.validateAndApplyMove({
    state: s3,
    players: threePlayers,
    playerId: 'p2',
    move: { type: 'submit_round', answers: { Stadt: `${s3.letter}b` } },
  }).state;
  const afterLeave = stadtLandFlussGame.onPlayerLeave!(s3, 'p3', mockPlayers);
  assert.equal(afterLeave.status, 'playing');
  assert.equal(afterLeave.phase, 'review');

  manager.clearAllTimers();
});

test('Stadt, Land, Fluss: Eigene Wörter Option (An/Aus), reihum Kategorien-Wahl pro Runde, Fallback & TV-Flow', () => {
  const manager = new LobbyManager();
  const sTv = manager.sessionManager.createSession('u_slf_tv').session;
  const sP1 = manager.sessionManager.createSession('u_slf_c1').session;
  const sP2 = manager.sessionManager.createSession('u_slf_c2').session;

  const created = manager.createLobby({
    name: 'SLF-Custom-TV',
    isPrivate: true,
    gameId: 'stadt-land-fluss',
    userProfile: { id: 'u_slf_tv', name: 'TV', avatar: {} },
    socketId: 'slf_c_tv',
    isTvMode: true,
    sessionId: sTv.sessionId,
  });
  const lobbyId = created.lobby!.id;

  const updated = manager.updateSettings({
    lobbyId,
    playerId: 'u_slf_tv',
    settings: { rounds: 2, roundDuration: 45, customWordsEnabled: true },
  });
  assert.equal(updated.success, true);
  assert.equal(updated.lobby?.settings?.customWordsEnabled, true);

  manager.joinLobby({
    lobbyIdOrCode: lobbyId,
    userProfile: { id: 'u_slf_c1', name: 'Anna', avatar: {} },
    socketId: 'slf_c_p1',
    sessionId: sP1.sessionId,
  });
  manager.joinLobby({
    lobbyIdOrCode: lobbyId,
    userProfile: { id: 'u_slf_c2', name: 'Ben', avatar: {} },
    socketId: 'slf_c_p2',
    sessionId: sP2.sessionId,
  });
  manager.toggleReady('slf_c_p1');
  manager.toggleReady('slf_c_p2');

  const started = manager.startGame('slf_c_tv');
  assert.equal(started.success, true);
  const gs1 = started.lobby!.gameState as any;
  assert.equal(gs1.customWordsEnabled, true);
  assert.equal(gs1.phase, 'choosing_categories');
  assert.equal(gs1.letter, '');
  assert.equal(gs1.categoryChooserId, 'u_slf_c1');

  // Nicht-Wähler (Ben) darf Kategorien nicht festlegen
  const wrongPlayer = manager.makeMove({
    lobbyId,
    playerId: 'u_slf_c2',
    move: { type: 'set_categories', categories: ['Automarke', 'Superheld', 'Schulfach'] },
  });
  assert.equal(wrongPlayer.success, false);

  // Zu wenige eindeutige Kategorien (< 3 nach Deduplizierung) werden abgelehnt
  const tooFew = manager.makeMove({
    lobbyId,
    playerId: 'u_slf_c1',
    move: { type: 'set_categories', categories: ['Automarke', 'automarke', 'Hobby'] },
  });
  assert.equal(tooFew.success, false);

  // Anna legt 4 eindeutige Kategorien fest -> Buchstabe wird gezogen & 'writing' startet
  const chosen = manager.makeMove({
    lobbyId,
    playerId: 'u_slf_c1',
    move: {
      type: 'set_categories',
      categories: ['Automarke', 'Automarke', 'Superheld', 'Hobby', 'Essen'],
    },
  });
  assert.equal(chosen.success, true);
  const gsWrite = chosen.lobby!.gameState as any;
  assert.equal(gsWrite.phase, 'writing');
  assert.deepEqual(gsWrite.categories, ['Automarke', 'Superheld', 'Hobby', 'Essen']);
  assert.equal(gsWrite.letter.length, 1);

  const L = gsWrite.letter as string;
  manager.makeMove({
    lobbyId,
    playerId: 'u_slf_c1',
    move: {
      type: 'submit_round',
      answers: {
        Automarke: `${L}auto`,
        Superheld: `${L}held`,
        Hobby: `${L}hobby`,
        Essen: `${L}essen`,
      },
      triggerStop: true,
    },
  });
  manager.makeMove({ lobbyId, playerId: 'u_slf_c1', move: { type: 'review_ready' } });
  const r1Over = manager.makeMove({ lobbyId, playerId: 'u_slf_c2', move: { type: 'review_ready' } });
  assert.equal((r1Over.lobby?.gameState as any).phase, 'round_over');

  // Runde 2 -> nächster Spieler (Ben) darf Kategorien wählen!
  const round2 = manager.makeMove({ lobbyId, playerId: 'u_slf_c1', move: { type: 'next_round' } });
  const gs2 = round2.lobby!.gameState as any;
  assert.equal(gs2.round, 2);
  assert.equal(gs2.phase, 'choosing_categories');
  assert.equal(gs2.categoryChooserId, 'u_slf_c2');
  assert.equal(gs2.letter, '');

  // Zeitablauf-Fallback in 'choosing_categories' setzt Preset-Kategorien und startet 'writing'
  gs2.phaseEndsAt = Date.now() - 2000;
  const afterTimeout = manager.makeMove({
    lobbyId,
    playerId: 'u_slf_c1',
    move: { type: 'time_up' },
  });
  const gs2Write = afterTimeout.lobby!.gameState as any;
  assert.equal(gs2Write.phase, 'writing');
  assert.equal(gs2Write.letter.length, 1);
  assert.equal(gs2Write.categories.length, 5);

  // Verlässt der aktuelle Wähler während 'choosing_categories', übernimmt der nächste aktive Spieler
  const threePlayers: Player[] = [
    ...mockPlayers,
    { id: 'p3', socketId: 'sock_3', name: 'Clara', avatar: {}, isReady: true, isHost: false, connected: true },
  ];
  const sCustom = stadtLandFlussGame.initGameState(threePlayers, 'p1', { customWordsEnabled: true });
  assert.equal(sCustom.categoryChooserId, 'p1');
  const rotatedOnLeave = stadtLandFlussGame.onPlayerLeave!(sCustom, 'p1', threePlayers.slice(1));
  assert.equal(rotatedOnLeave.phase, 'choosing_categories');
  assert.equal(rotatedOnLeave.categoryChooserId, 'p2');

  manager.clearAllTimers();
});

test('Casino Roulette: Startguthaben, Chip-Wetten, Auszahlungsquoten (35:1/2:1/1:1), Rettungsbonus & TV/Solo-Flow', () => {
  // 1) Auszahlungs- & Casino-Regelwerk prüfen (inkl. 0 verliert Außenwetten)
  assert.equal(getBetPayoutMultiplier('number:17'), 36);
  assert.equal(getBetPayoutMultiplier('dozen:2'), 3);
  assert.equal(getBetPayoutMultiplier('column:1'), 3);
  assert.equal(getBetPayoutMultiplier('color:red'), 2);

  assert.equal(doesBetWin('number:0', 0), true);
  assert.equal(doesBetWin('color:red', 0), false);
  assert.equal(doesBetWin('color:black', 0), false);
  assert.equal(doesBetWin('parity:even', 0), false);
  assert.equal(doesBetWin('range:low', 0), false);
  assert.equal(doesBetWin('dozen:1', 0), false);
  assert.equal(doesBetWin('column:3', 0), false);

  assert.equal(doesBetWin('color:red', 19), true);
  assert.equal(doesBetWin('color:black', 17), true);
  assert.equal(doesBetWin('dozen:2', 17), true);
  assert.equal(doesBetWin('column:2', 17), true);

  // Multi-Feld-Wetten (2er Split, 3er Street/Trio, 4er Corner/First-Four, 6er Line)
  assert.equal(isValidBetKey('split:14-17'), true);
  assert.equal(isValidBetKey('split:0-2'), true);
  assert.equal(isValidBetKey('street:7-8-9'), true);
  assert.equal(isValidBetKey('street:0-1-2'), true);
  assert.equal(isValidBetKey('corner:14-15-17-18'), true);
  assert.equal(isValidBetKey('corner:0-1-2-3'), true);
  assert.equal(isValidBetKey('line:13-18'), true);

  assert.equal(isValidBetKey('split:3-4'), false);
  assert.equal(isValidBetKey('split:17-14'), false);
  assert.equal(isValidBetKey('corner:3-4-6-7'), false);
  assert.equal(isValidBetKey('street:2-3-4'), false);
  assert.equal(isValidBetKey('line:2-7'), false);

  assert.equal(getBetPayoutMultiplier('split:14-17'), 18); // 17:1 + Einsatz
  assert.equal(getBetPayoutMultiplier('street:7-8-9'), 12); // 11:1 + Einsatz
  assert.equal(getBetPayoutMultiplier('corner:14-15-17-18'), 9); // 8:1 + Einsatz
  assert.equal(getBetPayoutMultiplier('line:13-18'), 6); // 5:1 + Einsatz

  assert.equal(doesBetWin('split:14-17', 17), true);
  assert.equal(doesBetWin('split:14-17', 14), true);
  assert.equal(doesBetWin('split:14-17', 15), false);
  assert.equal(doesBetWin('corner:14-15-17-18', 15), true);
  assert.equal(doesBetWin('corner:0-1-2-3', 0), true);
  assert.equal(doesBetWin('line:13-18', 18), true);

  // Zod-Schemas akzeptieren Roulette-Moves und Startguthaben
  assert.equal(
    GameMoveSchema.safeParse({ type: 'place_bet', betKey: 'number:17', amount: 100 }).success,
    true
  );
  assert.equal(
    GameMoveSchema.safeParse({ type: 'place_bet', betKey: 'corner:32-33-35-36', amount: 50 }).success,
    true
  );
  assert.equal(GameMoveSchema.safeParse({ type: 'lock_bets' }).success, true);
  assert.equal(GameMoveSchema.safeParse({ type: 'finish_spin' }).success, true);

  // 2) Solo-Spieler + Rettungsbonus + Verdopplung + Undo testen
  const manager = new LobbyManager();
  const sSolo = manager.sessionManager.createSession('u_r_solo').session;
  const soloLobby = manager.createLobby({
    name: 'Casino Solo',
    isPrivate: true,
    gameId: 'roulette',
    userProfile: { id: 'u_r_solo', name: 'CroupierFan', avatar: {} },
    socketId: 'r_solo_sock',
    isTvMode: false,
    sessionId: sSolo.sessionId,
  });
  assert.equal(soloLobby.success, true);
  assert.equal(soloLobby.lobby?.minPlayers, 1);
  assert.equal(soloLobby.lobby?.settings?.startingBalance, 1000);

  manager.updateSettings({
    lobbyId: soloLobby.lobby!.id,
    playerId: 'u_r_solo',
    settings: { rounds: 2, roundDuration: 30, startingBalance: 500 },
  });
  const startedSolo = manager.startGame('r_solo_sock');
  assert.equal(startedSolo.success, true);
  let rState = startedSolo.lobby!.gameState as RouletteState;
  assert.equal(rState.balances.u_r_solo, 500);
  assert.equal(rState.scores.u_r_solo, 500);

  // Setzen, 2x verdoppeln & Undo prüfen
  manager.makeMove({
    lobbyId: soloLobby.lobby!.id,
    playerId: 'u_r_solo',
    move: { type: 'place_bet', betKey: 'color:red', amount: 100 },
  });
  const doubled = manager.makeMove({
    lobbyId: soloLobby.lobby!.id,
    playerId: 'u_r_solo',
    move: { type: 'double_bets' },
  });
  rState = doubled.lobby!.gameState as RouletteState;
  assert.equal(rState.bets.u_r_solo['color:red'], 200);
  assert.equal(rState.balances.u_r_solo, 300);
  assert.equal(rState.scores.u_r_solo, 500);

  const undone = manager.makeMove({
    lobbyId: soloLobby.lobby!.id,
    playerId: 'u_r_solo',
    move: { type: 'undo_bet' },
  });
  rState = undone.lobby!.gameState as RouletteState;
  assert.equal(rState.bets.u_r_solo['color:red'], 100);
  assert.equal(rState.balances.u_r_solo, 400);

  // Zu hoher Einsatz wird abgelehnt
  const overBet = manager.makeMove({
    lobbyId: soloLobby.lobby!.id,
    playerId: 'u_r_solo',
    move: { type: 'place_bet', betKey: 'number:7', amount: 450 },
  });
  assert.equal(overBet.success, false);

  // 3) Direkte deterministische Spins mit Auszahlungsprüfung (2 Spieler + Rettungsbonus)
  let state2p = rouletteGame.initGameState(mockPlayers, 'p1', {
    rounds: 2,
    roundDuration: 30,
    startingBalance: 500,
  });
  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p1',
    move: { type: 'place_bet', betKey: 'number:17', amount: 100 },
  }).state;
  // Bob setzt sein ganzes Guthaben auf Rot (und verliert bei 17 Schwarz)
  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'place_bet', betKey: 'color:red', amount: 500 },
  }).state;

  // Beide bestätigen -> spinning
  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p1',
    move: { type: 'lock_bets' },
  }).state;
  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'lock_bets' },
  }).state;
  assert.equal(state2p.phase, 'spinning');

  // Fixiere Gewinnzahl auf 17 (Schwarz) & simuliere abgeschlossene Spin-Zeit
  state2p = {
    ...state2p,
    winningNumber: 17,
    winningColor: 'black',
    phaseEndsAt: Date.now() - 10,
  };
  // Während spinning bleiben balances noch unverändert vor finish_spin
  assert.equal(state2p.balances.p1, 400);

  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p1',
    move: { type: 'finish_spin' },
  }).state;
  assert.equal(state2p.phase, 'result');
  // 100 * 36 = 3600 Auszahlung -> 400 + 3600 = 4000 (+3500 Reingewinn)
  assert.equal(state2p.balances.p1, 4000);
  assert.equal(state2p.lastOutcome?.netProfit.p1, 3500);
  assert.equal(state2p.balances.p2, 0);
  assert.equal(state2p.lastOutcome?.netProfit.p2, -500);

  // Zweites finish_spin ist idempotent (zahlt nicht doppelt!)
  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'finish_spin' },
  }).state;
  assert.equal(state2p.balances.p1, 4000);

  // Weiter in Runde 2 -> Bob (0 €) erhält automatisch 50 € Rettungsbonus!
  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p1',
    move: { type: 'next_round' },
  }).state;
  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'next_round' },
  }).state;
  assert.equal(state2p.round, 2);
  assert.equal(state2p.phase, 'betting');
  assert.equal(state2p.balances.p2, 50);
  assert.equal(state2p.rebuyBonuses.p2, 50);

  // Rebet funktioniert für Alice (setzt erneut 100 auf 17)
  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p1',
    move: { type: 'rebet' },
  }).state;
  assert.equal(state2p.bets.p1['number:17'], 100);
  assert.equal(state2p.balances.p1, 3900);

  // Alice und Bob platzieren parallel, verschieben (move_bet) und ziehen eigene Chips zurück (remove_bet),
  // ohne die Chips des jeweils anderen verändern oder entfernen zu können
  const bobsAttemptOnAliceField = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'remove_bet', betKey: 'number:17' },
  });
  assert.equal(bobsAttemptOnAliceField.valid, false);
  assert.equal(state2p.bets.p1['number:17'], 100);

  // Alice verschiebt ihren 100€ Chip von number:17 auf color:black und nimmt einen 25€ Teilbetrag zurück
  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p1',
    move: { type: 'move_bet', fromBetKey: 'number:17', toBetKey: 'color:black' },
  }).state;
  assert.equal(state2p.bets.p1['number:17'], undefined);
  assert.equal(state2p.bets.p1['color:black'], 100);
  assert.equal(state2p.balances.p1, 3900);

  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p1',
    move: { type: 'remove_bet', betKey: 'color:black', amount: 25 },
  }).state;
  assert.equal(state2p.bets.p1['color:black'], 75);
  assert.equal(state2p.balances.p1, 3925);

  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p1',
    move: { type: 'remove_bet', betKey: 'color:black' },
  }).state;
  assert.equal(state2p.bets.p1['color:black'], undefined);
  assert.equal(state2p.balances.p1, 4000);

  // Bob platziert parallel auf demselben Feld, zieht zurück & setzt dann seine Corner/Split-Wetten
  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'place_bet', betKey: 'color:red', amount: 25 },
  }).state;
  assert.equal(state2p.bets.p2['color:red'], 25);
  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'remove_bet', betKey: 'color:red' },
  }).state;
  assert.equal(state2p.bets.p2['color:red'], undefined);
  assert.equal(state2p.balances.p2, 50);

  // Bob platziert in Runde 2 sowohl eine 4er-Wette (Corner 14-15-17-18) als auch einen 2er-Split (14-17)
  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'place_bet', betKey: 'corner:14-15-17-18', amount: 25 },
  }).state;
  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'place_bet', betKey: 'split:14-17', amount: 25 },
  }).state;
  assert.equal(state2p.bets.p2['corner:14-15-17-18'], 25);
  assert.equal(state2p.bets.p2['split:14-17'], 25);
  assert.equal(state2p.balances.p2, 0);

  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p1',
    move: { type: 'lock_bets' },
  }).state;
  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'lock_bets' },
  }).state;
  state2p = {
    ...state2p,
    winningNumber: 14,
    winningColor: 'red',
    phaseEndsAt: Date.now() - 10,
  };
  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p2',
    move: { type: 'finish_spin' },
  }).state;
  // Gewinnzahl 14 trifft Bobs Corner (25*9=225) + Split (25*18=450) => 675 € Auszahlung (+625 Reingewinn)
  assert.equal(state2p.balances.p2, 675);
  assert.equal(state2p.lastOutcome?.netProfit.p2, 625);

  // Spielrunde 2 zu Ende bringen -> Alice gewinnt mit höchstem Guthaben
  state2p = {
    ...state2p,
    phase: 'result',
    phaseEndsAt: Date.now() - 10,
    balances: { p1: 4000, p2: 50 },
    bets: { p1: {}, p2: {} },
    scores: { p1: 4000, p2: 50 },
  };
  state2p = rouletteGame.validateAndApplyMove({
    state: state2p,
    players: mockPlayers,
    playerId: 'p1',
    move: { type: 'time_up' },
  }).state;
  assert.equal(state2p.phase, 'game_over');
  assert.equal(state2p.status, 'won');
  assert.equal(state2p.winnerId, 'p1');

  // 4) Paralleles Multiplayer-Roulette über LobbyManager (gleichzeitige Züge trotz identischer stateVersion + synchrone Sichtbarkeit)
  const sMultiA = manager.sessionManager.createSession('u_r_a').session;
  const sMultiB = manager.sessionManager.createSession('u_r_b').session;
  const multiLobby = manager.createLobby({
    name: 'Casino Sync',
    isPrivate: true,
    gameId: 'roulette',
    userProfile: { id: 'u_r_a', name: 'Alice', avatar: {} },
    socketId: 'r_a_sock',
    isTvMode: false,
    sessionId: sMultiA.sessionId,
  });
  const mLobbyId = multiLobby.lobby!.id;
  manager.joinLobby({
    lobbyIdOrCode: multiLobby.lobby!.code,
    userProfile: { id: 'u_r_b', name: 'Bob', avatar: {} },
    socketId: 'r_b_sock',
    sessionId: sMultiB.sessionId,
  });
  manager.toggleReady('r_b_sock');
  const startedMulti = manager.startGame('r_a_sock');
  assert.equal(startedMulti.success, true);

  // Beide Spieler senden gleichzeitig auf Basis derselben initialen stateVersion
  const staleSharedVersion = startedMulti.lobby!.stateVersion;
  const moveA1 = manager.makeMove({
    lobbyId: mLobbyId,
    playerId: 'u_r_a',
    move: { type: 'place_bet', betKey: 'number:17', amount: 100 },
    expectedVersion: staleSharedVersion,
  });
  const moveB1 = manager.makeMove({
    lobbyId: mLobbyId,
    playerId: 'u_r_b',
    move: { type: 'place_bet', betKey: 'color:red', amount: 25 },
    expectedVersion: staleSharedVersion,
  });
  assert.equal(moveA1.success, true);
  assert.equal(moveB1.success, true);

  // Alice verschiebt & zieht zurück, Bob sieht jederzeit denselben Zustand
  const moveA2 = manager.makeMove({
    lobbyId: mLobbyId,
    playerId: 'u_r_a',
    move: { type: 'move_bet', fromBetKey: 'number:17', toBetKey: 'split:14-17' },
    expectedVersion: staleSharedVersion,
  });
  assert.equal(moveA2.success, true);

  // Bob darf Alices Chip nicht entfernen
  const bobSteals = manager.makeMove({
    lobbyId: mLobbyId,
    playerId: 'u_r_b',
    move: { type: 'remove_bet', betKey: 'split:14-17' },
  });
  assert.equal(bobSteals.success, false);

  const moveA3 = manager.makeMove({
    lobbyId: mLobbyId,
    playerId: 'u_r_a',
    move: { type: 'remove_bet', betKey: 'split:14-17' },
  });
  assert.equal(moveA3.success, true);

  const viewForA = sanitizeLobbyForClient(manager.getLobbyById(mLobbyId)!, 'u_r_a')
    .gameState as RouletteState;
  const viewForB = sanitizeLobbyForClient(manager.getLobbyById(mLobbyId)!, 'u_r_b')
    .gameState as RouletteState;
  assert.deepEqual(viewForA.bets, viewForB.bets);
  assert.equal(viewForA.bets.u_r_a['split:14-17'], undefined);
  assert.equal(viewForA.balances.u_r_a, 1000);
  assert.equal(viewForA.bets.u_r_b['color:red'], 25);

  manager.clearAllTimers();
});

test("Poker Texas Hold'em: Hand-Evaluator, Karten-Privatsphäre (TV/Gegner), Blinds, Side-Pots & TV-Flow", () => {
  // 1) Poker Hand-Evaluator testen (inkl. Wheel-Straße A-2-3-4-5 < 6-hoch)
  const royal = evaluateBestPokerHand([
    { suit: 'spades', rank: 14 },
    { suit: 'spades', rank: 13 },
    { suit: 'spades', rank: 12 },
    { suit: 'spades', rank: 11 },
    { suit: 'spades', rank: 10 },
    { suit: 'hearts', rank: 2 },
    { suit: 'clubs', rank: 3 },
  ])!;
  const wheel = evaluateBestPokerHand([
    { suit: 'spades', rank: 14 },
    { suit: 'hearts', rank: 2 },
    { suit: 'diamonds', rank: 3 },
    { suit: 'clubs', rank: 4 },
    { suit: 'spades', rank: 5 },
    { suit: 'hearts', rank: 9 },
    { suit: 'clubs', rank: 11 },
  ])!;
  const sixHighStraight = evaluateBestPokerHand([
    { suit: 'spades', rank: 6 },
    { suit: 'hearts', rank: 2 },
    { suit: 'diamonds', rank: 3 },
    { suit: 'clubs', rank: 4 },
    { suit: 'spades', rank: 5 },
    { suit: 'hearts', rank: 13 },
    { suit: 'clubs', rank: 9 },
  ])!;
  assert.equal(royal.name, 'Royal Flush');
  assert.ok(royal.score > sixHighStraight.score);
  assert.ok(sixHighStraight.score > wheel.score);

  // Zod-Schema für Poker-Aktionen prüfen
  assert.equal(
    GameMoveSchema.safeParse({ type: 'poker_action', action: 'raise', targetBet: 80 }).success,
    true
  );
  assert.equal(GameMoveSchema.safeParse({ type: 'poker_action', action: 'invalid_x' }).success, false);

  // 2) Lobby-Integration & Karten-Privatsphäre pro Empfänger testen (Standard + TV-Modus)
  const manager = new LobbyManager();
  const sTv = manager.sessionManager.createSession('u_pk_tv').session;
  const sA = manager.sessionManager.createSession('u_pk_a').session;
  const sB = manager.sessionManager.createSession('u_pk_b').session;

  const created = manager.createLobby({
    name: 'Poker Lounge',
    isPrivate: true,
    gameId: 'texas-holdem',
    userProfile: { id: 'u_pk_tv', name: 'TV', avatar: {} },
    socketId: 'pk_tv_sock',
    isTvMode: true,
    sessionId: sTv.sessionId,
  });
  assert.equal(created.success, true);
  const lobbyId = created.lobby!.id;
  assert.equal(created.lobby?.minPlayers, 2);
  assert.equal(created.lobby?.settings?.smallBlind, 10);

  manager.updateSettings({
    lobbyId,
    playerId: 'u_pk_tv',
    settings: { rounds: 5, roundDuration: 30, startingBalance: 500, smallBlind: 10 },
  });
  manager.joinLobby({
    lobbyIdOrCode: lobbyId,
    userProfile: { id: 'u_pk_a', name: 'Alice', avatar: {} },
    socketId: 'pk_a_sock',
    sessionId: sA.sessionId,
  });
  manager.joinLobby({
    lobbyIdOrCode: lobbyId,
    userProfile: { id: 'u_pk_b', name: 'Bob', avatar: {} },
    socketId: 'pk_b_sock',
    sessionId: sB.sessionId,
  });
  manager.toggleReady('pk_a_sock');
  manager.toggleReady('pk_b_sock');
  const started = manager.startGame('pk_tv_sock');
  assert.equal(started.success, true);

  // Privatsphäre: Alice sieht nur ihre eigenen 2 Karten, Bob sieht nur seine, TV sieht KEINE, Deck fehlt überall!
  const rawLobby = manager.getLobbyById(lobbyId)!;
  const viewAlice = sanitizeLobbyForClient(rawLobby, 'u_pk_a').gameState as TexasHoldemState;
  const viewBob = sanitizeLobbyForClient(rawLobby, 'u_pk_b').gameState as TexasHoldemState;
  const viewTv = sanitizeLobbyForClient(rawLobby, 'u_pk_tv').gameState as TexasHoldemState;

  assert.equal(viewAlice.deck, undefined);
  assert.equal(viewAlice.holeCards.u_pk_a?.length, 2);
  assert.equal(viewAlice.holeCards.u_pk_b, undefined);
  assert.equal(viewBob.holeCards.u_pk_b?.length, 2);
  assert.equal(viewBob.holeCards.u_pk_a, undefined);
  assert.equal(Object.keys(viewTv.holeCards).length, 0);

  // Heads-Up Blinds: Dealer ist SB (10 €), anderer Big Blind (20 €), Dealer agiert Pre-Flop zuerst
  assert.equal(viewAlice.smallBlindId, viewAlice.dealerId);
  assert.equal(viewAlice.currentTurn, viewAlice.dealerId);
  assert.equal(viewAlice.pot, 30);

  // Alice (Dealer/SB) erhöht auf 60 €, Bob foldet -> Pot geht ohne Showdown-Aufdeckung an Alice!
  const raiseRes = manager.makeMove({
    lobbyId,
    playerId: viewAlice.currentTurn,
    move: { type: 'poker_action', action: 'raise', targetBet: 60 },
  });
  assert.equal(raiseRes.success, true);
  assert.equal((raiseRes.lobby?.gameState as TexasHoldemState).pot, 80);

  const foldRes = manager.makeMove({
    lobbyId,
    playerId: 'u_pk_b',
    move: { type: 'poker_action', action: 'fold' },
  });
  assert.equal(foldRes.success, true);
  const afterFold = sanitizeLobbyForClient(manager.getLobbyById(lobbyId)!, 'u_pk_b')
    .gameState as TexasHoldemState;
  assert.equal(afterFold.phase, 'showdown');
  assert.equal(afterFold.showdown?.wonByFold, true);
  assert.equal(afterFold.balances.u_pk_a, 520); // +20 € (Bobs BB gewonnen)
  assert.equal(afterFold.balances.u_pk_b, 480);
  // Gewinnerkarten bleiben bei Fold-Sieg geheim!
  assert.equal(afterFold.holeCards.u_pk_a, undefined);

  // 3) Side-Pot-Verteilung bei 3 Spielern (Short Stack All-In + großer Side Pot)
  const p3Players: Player[] = [
    ...mockPlayers,
    { id: 'p3', socketId: 's3', name: 'Clara', avatar: {}, isReady: true, isHost: false, connected: true },
  ];
  let spState = texasHoldemGame.initGameState(p3Players, 'p1', {
    rounds: 4,
    roundDuration: 30,
    startingBalance: 500,
    smallBlind: 10,
  });

  const board: PokerCard[] = [
    { suit: 'spades', rank: 2 },
    { suit: 'hearts', rank: 7 },
    { suit: 'diamonds', rank: 9 },
    { suit: 'clubs', rank: 11 },
    { suit: 'diamonds', rank: 3 },
  ];
  // Konstruiere deterministische Side-Pot-Situation: p1=100 (Asse = gewinnt Main Pot 300),
  // p2=300 (Könige = gewinnt Side Pot 400 gegen p3), p3=300 (Damen)
  spState = {
    ...spState,
    phase: 'river',
    currentBet: 300,
    pot: 600,
    balances: { p1: 0, p2: 200, p3: 300 },
    streetBets: { p1: 100, p2: 300, p3: 200 },
    handContributions: { p1: 100, p2: 300, p3: 200 },
    handStartBalances: { p1: 100, p2: 500, p3: 500 },
    allInIds: ['p1'],
    actedIds: ['p1', 'p2'],
    foldedIds: [],
    communityCards: board,
    holeCards: {
      p1: [{ suit: 'spades', rank: 14 }, { suit: 'hearts', rank: 14 }],
      p2: [{ suit: 'spades', rank: 13 }, { suit: 'hearts', rank: 13 }],
      p3: [{ suit: 'spades', rank: 12 }, { suit: 'hearts', rank: 12 }],
    },
    currentTurn: 'p3',
  };
  const sidePotShowdown = texasHoldemGame.validateAndApplyMove({
    state: spState,
    players: p3Players,
    playerId: 'p3',
    move: { type: 'poker_action', action: 'call' },
  }).state;

  assert.equal(sidePotShowdown.phase, 'showdown');
  assert.equal(sidePotShowdown.showdown?.wonByFold, false);
  // p1 (Asse) erhält Main Pot: 100 * 3 = 300 €
  assert.equal(sidePotShowdown.balances.p1, 300);
  // p2 (Könige) erhält Side Pot: (300 - 100) * 2 = 400 € -> 200 + 400 = 600 €
  assert.equal(sidePotShowdown.balances.p2, 600);
  // p3 verliert beide Pots -> bleibt bei 200 €
  assert.equal(sidePotShowdown.balances.p3, 200);
  // Chiperhaltungs-Check: 300 + 600 + 200 === 1100 (100 + 500 + 500)!
  assert.equal(
    sidePotShowdown.balances.p1 + sidePotShowdown.balances.p2 + sidePotShowdown.balances.p3,
    1100
  );

  manager.clearAllTimers();
});

test('Spiel-Simulation: Sofortstart mit Bots ohne zweite Lobby-Person, TV-Sim & Aufräumen beim Verlassen', async () => {
  assert.equal(
    LobbySimulateSchema.safeParse({
      gameId: 'texas-holdem',
      userProfile: { id: 'u_sim_1', name: 'Tester', avatar: {} },
      isTvMode: false,
      botCount: 2,
    }).success,
    true
  );

  const simManager = new LobbyManager();

  // 1) Poker-Simulation im Handy-Modus startet sofort (obwohl minPlayers = 2 und niemand beigetreten ist)
  const pokerSim = simManager.createAndStartSimulatedLobby({
    gameId: 'texas-holdem',
    userProfile: { id: 'u_sim_host', name: 'SimHost', avatar: {} },
    socketId: 'sock_sim_host',
    isTvMode: false,
    botCount: 2,
  });
  assert.equal(pokerSim.success, true);
  assert.equal(pokerSim.lobby?.status, 'in_progress');
  assert.equal(pokerSim.lobby?.isSimulated, true);
  assert.equal(pokerSim.lobby?.players.length, 3);
  assert.equal(pokerSim.lobby?.players.filter((p) => p.isBot).length, 2);

  // Geschlossene Simulation lehnt fremde Lobby-Beitritte ab und ist nicht öffentlich gelistet
  assert.equal(simManager.getPublicLobbies().length, 0);
  const outsider = simManager.joinLobby({
    lobbyIdOrCode: pokerSim.lobby!.code,
    userProfile: { id: 'u_other', name: 'Fremder', avatar: {} },
    socketId: 'sock_other',
  });
  assert.equal(outsider.success, false);

  // Rematch in simulierter Lobby startet nach Beenden sofort allein durch Vote des Hosts
  const lobbyObj = simManager.getLobbyById(pokerSim.lobby!.id)!;
  lobbyObj.status = 'finished';
  lobbyObj.gameState = {
    ...lobbyObj.gameState!,
    status: 'won',
    winnerId: 'u_sim_host',
  };
  const rematchRes = simManager.requestRematch({
    lobbyId: lobbyObj.id,
    playerId: 'u_sim_host',
  });
  assert.equal(rematchRes.success, true);
  assert.equal(rematchRes.restarted, true);
  assert.equal(rematchRes.lobby?.status, 'in_progress');

  // Verlassen löscht die simulierte Lobby sofort (Bots zählen nicht als offene Menschen)
  const left = simManager.leaveCurrentLobby('sock_sim_host', 'u_sim_host');
  assert.equal(left.deleted, true);
  assert.equal(simManager.getLobbyById(pokerSim.lobby!.id), undefined);

  // 2) Roulette TV-Modus Simulation + Bot-Runner setzt automatisch Bot-Einsätze
  const rouletteSim = simManager.createAndStartSimulatedLobby({
    gameId: 'roulette',
    userProfile: { id: 'u_sim_tv', name: 'TVTester', avatar: {} },
    socketId: 'sock_sim_tv',
    isTvMode: true,
    botCount: 2,
  });
  assert.equal(rouletteSim.success, true);
  assert.equal(rouletteSim.lobby?.isTvMode, true);
  assert.equal(rouletteSim.lobby?.players.find((p) => p.id === 'u_sim_tv')?.isTvScreen, true);
  assert.equal(rouletteSim.lobby?.players.filter((p) => p.isBot).length, 2);

  const botRunner = new SimulationBotRunner((lobbyId, playerId, move) => {
    const res = simManager.makeMove({ lobbyId, playerId, move });
    if (res.success && res.lobby) {
      botRunner.syncLobby(res.lobby);
    }
  });
  botRunner.syncLobby(rouletteSim.lobby);

  // Warten bis erster Bot seinen Einsatz gesetzt hat
  await new Promise((r) => setTimeout(r, 850));
  const afterBotBet = simManager.getLobbyById(rouletteSim.lobby!.id)?.gameState as RouletteState;
  const botPlayer = rouletteSim.lobby!.players.find((p) => p.isBot)!;
  const placedTotal = Object.values(afterBotBet.bets?.[botPlayer.id] || {}).reduce(
    (sum, val) => sum + val,
    0
  );
  assert.ok(placedTotal > 0);

  botRunner.clearAll();
  simManager.clearAllTimers();
});

test('Spielwechsel in bestehender Lobby behält Raumcode und alle verbundenen Mitspieler', () => {
  const manager = new LobbyManager();

  const created = manager.createLobby({
    gameId: 'draw-and-guess',
    isPrivate: true,
    isTvMode: true,
    userProfile: { id: 'u_tv_host', name: 'WohnzimmerTV', avatar: {} },
    socketId: 'sock_tv_host',
  });
  assert.equal(created.success, true);
  assert.ok(created.lobby);
  const lobbyId = created.lobby!.id;
  const lobbyCode = created.lobby!.code;

  const joined = manager.joinLobby({
    lobbyIdOrCode: lobbyCode,
    userProfile: { id: 'u_guest_1', name: 'Alice', avatar: {} },
    socketId: 'sock_guest_1',
  });
  assert.equal(joined.success, true);
  assert.equal(joined.lobby?.players.length, 2);

  // Gast darf das Spiel nicht wechseln
  const guestAttempt = manager.switchLobbyGame({
    lobbyId,
    playerId: 'u_guest_1',
    gameId: 'roulette',
  });
  assert.equal(guestAttempt.success, false);

  // Host wechselt Spiel -> Lobby bleibt mit demselben Code und allen Spielern bestehen
  const switched = manager.switchLobbyGame({
    lobbyId,
    playerId: 'u_tv_host',
    gameId: 'roulette',
    actionId: 'act_switch_roulette',
  });
  assert.equal(switched.success, true);
  assert.equal(switched.lobby?.id, lobbyId);
  assert.equal(switched.lobby?.code, lobbyCode);
  assert.equal(switched.lobby?.gameId, 'roulette');
  assert.equal(switched.lobby?.minPlayers, 1);
  assert.equal(switched.lobby?.players.length, 2);
  assert.equal(
    switched.lobby?.players.some((p) => p.id === 'u_guest_1'),
    true
  );

  // Idempotenz bei doppelter Action-ID
  const duplicateSwitch = manager.switchLobbyGame({
    lobbyId,
    playerId: 'u_tv_host',
    gameId: 'texas-holdem',
    actionId: 'act_switch_roulette',
  });
  assert.equal(duplicateSwitch.success, true);
  assert.equal(duplicateSwitch.duplicate, true);
  assert.equal(duplicateSwitch.lobby?.gameId, 'roulette');

  // Spielstart funktioniert mit dem mitgenommenen Spieler im neuen Spiel
  manager.toggleReady('sock_guest_1');
  const started = manager.startGame({ lobbyId, playerId: 'u_tv_host' });
  assert.equal(started.success, true);
  assert.equal(started.lobby?.gameId, 'roulette');

  // Im laufenden Spiel ist ein Spielwechsel blockiert
  const whilePlaying = manager.switchLobbyGame({
    lobbyId,
    playerId: 'u_tv_host',
    gameId: 'stadt-land-fluss',
  });
  assert.equal(whilePlaying.success, false);

  manager.clearAllTimers();
});

test('TV-Lobby Controller-Sperre: Smartphones dürfen weder Optionen ändern, Spiel wechseln noch starten', () => {
  const manager = new LobbyManager();
  const created = manager.createLobby({
    gameId: 'draw-and-guess',
    isPrivate: false,
    userProfile: { id: 'u_tv_ctrl', name: 'TV Host', avatar: {} },
    socketId: 'sock_tv_ctrl',
    isTvMode: true,
  });
  assert.equal(created.success, true);
  const lobbyId = created.lobby!.id;
  const code = created.lobby!.code;

  const p1 = manager.joinLobby({
    lobbyIdOrCode: code,
    userProfile: { id: 'u_phone_1', name: 'Phone 1', avatar: {} },
    socketId: 'sock_phone_1',
  });
  const p2 = manager.joinLobby({
    lobbyIdOrCode: code,
    userProfile: { id: 'u_phone_2', name: 'Phone 2', avatar: {} },
    socketId: 'sock_phone_2',
  });
  assert.equal(p1.success, true);
  assert.equal(p2.success, true);

  manager.toggleReady('sock_phone_1');
  manager.toggleReady('sock_phone_2');

  // Smartphone-Spieler darf in TV-Lobby keine Optionen ändern, kein Spiel wechseln und nicht starten
  const phoneSettings = manager.updateSettings({
    lobbyId,
    playerId: 'u_phone_1',
    settings: { rounds: 8 },
  });
  assert.equal(phoneSettings.success, false);

  const phoneSwitch = manager.switchLobbyGame({
    lobbyId,
    playerId: 'u_phone_1',
    gameId: 'roulette',
  });
  assert.equal(phoneSwitch.success, false);

  const phoneStart = manager.startGame({
    lobbyId,
    playerId: 'u_phone_1',
  });
  assert.equal(phoneStart.success, false);

  // TV-Screen darf alles davon
  const tvSettings = manager.updateSettings({
    lobbyId,
    playerId: 'u_tv_ctrl',
    settings: { rounds: 5 },
  });
  assert.equal(tvSettings.success, true);
  assert.equal(tvSettings.lobby?.settings?.rounds, 5);

  const tvSwitch = manager.switchLobbyGame({
    lobbyId,
    playerId: 'u_tv_ctrl',
    gameId: 'roulette',
  });
  assert.equal(tvSwitch.success, true);
  assert.equal(tvSwitch.lobby?.gameId, 'roulette');

  const tvStart = manager.startGame({
    lobbyId,
    playerId: 'u_tv_ctrl',
  });
  assert.equal(tvStart.success, true);
  assert.equal(tvStart.lobby?.status, 'in_progress');

  manager.clearAllTimers();
});
