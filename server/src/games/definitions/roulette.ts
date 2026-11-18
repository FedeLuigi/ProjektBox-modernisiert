import crypto from 'crypto';
import { BaseGameState, MultiplayerGameDefinition, Player } from '../../types/multiplayer.js';

// Originale europäische Roulette-Reihenfolge im Uhrzeigersinn (37 Fächer: 0-36)
export const ROULETTE_WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

export const RED_NUMBERS = new Set<number>([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export type RouletteColor = 'green' | 'red' | 'black';

export const SPIN_DURATION_MS = 4800;
export const RESULT_DURATION_MS = 8500;
export const MIN_RESCUE_THRESHOLD = 5;
export const RESCUE_BONUS_AMOUNT = 50;

export function getRouletteColor(num: number): RouletteColor {
  if (num === 0) return 'green';
  return RED_NUMBERS.has(num) ? 'red' : 'black';
}

export function isValidBetKey(betKey: string): boolean {
  if (typeof betKey !== 'string') return false;
  if (betKey.startsWith('number:')) {
    const raw = betKey.slice('number:'.length);
    if (!/^\d+$/.test(raw)) return false;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 && n <= 36;
  }
  return (
    betKey === 'dozen:1' ||
    betKey === 'dozen:2' ||
    betKey === 'dozen:3' ||
    betKey === 'column:1' ||
    betKey === 'column:2' ||
    betKey === 'column:3' ||
    betKey === 'color:red' ||
    betKey === 'color:black' ||
    betKey === 'parity:even' ||
    betKey === 'parity:odd' ||
    betKey === 'range:low' ||
    betKey === 'range:high'
  );
}

/**
 * Gesamtrückzahlung (Einsatz + Gewinn) als Multiplikator auf den Einsatz.
 */
export function getBetPayoutMultiplier(betKey: string): number {
  if (betKey.startsWith('number:')) return 36; // 35:1 + Einsatz
  if (betKey.startsWith('dozen:') || betKey.startsWith('column:')) return 3; // 2:1 + Einsatz
  return 2; // 1:1 + Einsatz (Rot/Schwarz, Gerade/Ungerade, 1-18/19-36)
}

export function doesBetWin(betKey: string, winningNumber: number): boolean {
  if (betKey.startsWith('number:')) {
    return Number(betKey.slice('number:'.length)) === winningNumber;
  }

  // Bei der 0 verlieren alle Außenwetten nach Casino-Regel
  if (winningNumber === 0) return false;

  switch (betKey) {
    case 'dozen:1':
      return winningNumber >= 1 && winningNumber <= 12;
    case 'dozen:2':
      return winningNumber >= 13 && winningNumber <= 24;
    case 'dozen:3':
      return winningNumber >= 25 && winningNumber <= 36;
    case 'column:1':
      return winningNumber % 3 === 1;
    case 'column:2':
      return winningNumber % 3 === 2;
    case 'column:3':
      return winningNumber % 3 === 0;
    case 'color:red':
      return RED_NUMBERS.has(winningNumber);
    case 'color:black':
      return !RED_NUMBERS.has(winningNumber);
    case 'parity:even':
      return winningNumber % 2 === 0;
    case 'parity:odd':
      return winningNumber % 2 === 1;
    case 'range:low':
      return winningNumber >= 1 && winningNumber <= 18;
    case 'range:high':
      return winningNumber >= 19 && winningNumber <= 36;
    default:
      return false;
  }
}

export interface RouletteSpinOutcome {
  round: number;
  winningNumber: number;
  winningColor: RouletteColor;
  settledBets: Record<string, Record<string, number>>;
  totalWagered: Record<string, number>;
  totalPayout: Record<string, number>;
  netProfit: Record<string, number>;
  balancesAfter: Record<string, number>;
}

export interface RouletteState extends BaseGameState {
  gameId: 'roulette';
  round: number;
  maxRounds: number;
  betDuration: number;
  startingBalance: number;
  phase: 'betting' | 'spinning' | 'result' | 'game_over';
  phaseEndsAt: number;
  spinStartedAt?: number;
  balances: Record<string, number>;
  rebuyBonuses: Record<string, number>;
  bets: Record<string, Record<string, number>>;
  betOrder: Record<string, Array<{ betKey: string; amount: number }>>;
  lastRoundBets: Record<string, Record<string, number>>;
  lockedPlayerIds: string[];
  nextReadyIds: string[];
  winningNumber: number | null;
  winningColor: RouletteColor | null;
  history: Array<{ round: number; number: number; color: RouletteColor }>;
  lastOutcome?: RouletteSpinOutcome;
  scores: Record<string, number>;
}

export type RouletteMove =
  | { type: 'place_bet'; betKey: string; amount: number }
  | { type: 'undo_bet' }
  | { type: 'clear_bets' }
  | { type: 'rebet' }
  | { type: 'double_bets' }
  | { type: 'lock_bets' }
  | { type: 'finish_spin' }
  | { type: 'next_round' }
  | { type: 'time_up' };

function sumPlayerBets(playerBets: Record<string, number> | undefined): number {
  if (!playerBets) return 0;
  let total = 0;
  for (const val of Object.values(playerBets)) {
    if (typeof val === 'number' && val > 0) total += val;
  }
  return total;
}

function computeScores(
  balances: Record<string, number>,
  bets: Record<string, Record<string, number>>
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const [playerId, bal] of Object.entries(balances)) {
    scores[playerId] = bal + sumPlayerBets(bets[playerId]);
  }
  return scores;
}

function transitionToSpinning(state: RouletteState, now = Date.now()): RouletteState {
  if (state.phase !== 'betting') return state;
  const winningNumber = crypto.randomInt(0, 37);
  const winningColor = getRouletteColor(winningNumber);

  return {
    ...state,
    phase: 'spinning',
    winningNumber,
    winningColor,
    spinStartedAt: now,
    phaseEndsAt: now + SPIN_DURATION_MS,
  };
}

function resolveSpinToResult(
  state: RouletteState,
  players: Player[],
  now = Date.now()
): RouletteState {
  if (state.phase !== 'spinning' || state.winningNumber === null) {
    return state;
  }

  const winNum = state.winningNumber;
  const winColor = getRouletteColor(winNum);
  const nextBalances: Record<string, number> = { ...state.balances };
  const nextLastRoundBets: Record<string, Record<string, number>> = { ...state.lastRoundBets };
  const settledBets: Record<string, Record<string, number>> = {};
  const totalWagered: Record<string, number> = {};
  const totalPayout: Record<string, number> = {};
  const netProfit: Record<string, number> = {};

  const playerIds = new Set<string>([
    ...Object.keys(state.balances),
    ...Object.keys(state.bets),
    ...players.map((p) => p.id),
  ]);

  for (const pid of playerIds) {
    const pBets = state.bets[pid] || {};
    const wagered = sumPlayerBets(pBets);
    let payout = 0;

    for (const [betKey, amount] of Object.entries(pBets)) {
      if (amount > 0 && doesBetWin(betKey, winNum)) {
        payout += amount * getBetPayoutMultiplier(betKey);
      }
    }

    const updatedBalance = (nextBalances[pid] ?? state.startingBalance) + payout;
    nextBalances[pid] = updatedBalance;
    settledBets[pid] = { ...pBets };
    totalWagered[pid] = wagered;
    totalPayout[pid] = payout;
    netProfit[pid] = payout - wagered;

    if (wagered > 0) {
      nextLastRoundBets[pid] = { ...pBets };
    }
  }

  const nextHistory = [{ round: state.round, number: winNum, color: winColor }, ...state.history].slice(
    0,
    18
  );
  const clearedBets = Object.fromEntries(Array.from(playerIds).map((pid) => [pid, {}]));
  const clearedOrder = Object.fromEntries(Array.from(playerIds).map((pid) => [pid, []]));

  return {
    ...state,
    phase: 'result',
    phaseEndsAt: now + RESULT_DURATION_MS,
    balances: nextBalances,
    bets: clearedBets,
    betOrder: clearedOrder,
    lastRoundBets: nextLastRoundBets,
    nextReadyIds: [],
    history: nextHistory,
    lastOutcome: {
      round: state.round,
      winningNumber: winNum,
      winningColor: winColor,
      settledBets,
      totalWagered,
      totalPayout,
      netProfit,
      balancesAfter: { ...nextBalances },
    },
    scores: computeScores(nextBalances, clearedBets),
  };
}

function advanceAfterResult(
  state: RouletteState,
  players: Player[],
  now = Date.now()
): RouletteState {
  if (state.phase !== 'result') return state;

  if (state.round >= state.maxRounds) {
    const finalScores = computeScores(state.balances, state.bets);
    const ranked = players
      .map((p) => ({ id: p.id, score: finalScores[p.id] ?? 0 }))
      .sort((a, b) => b.score - a.score);

    const topScore = ranked[0]?.score ?? 0;
    const winners = ranked.filter((r) => r.score === topScore);
    const isDraw = ranked.length > 1 && winners.length > 1;

    return {
      ...state,
      phase: 'game_over',
      status: isDraw ? 'draw' : 'won',
      winnerId: isDraw ? null : ranked[0]?.id || null,
      scores: finalScores,
    };
  }

  // Nächste Setzrunde: Spieler unter Mindest-Chip erhalten automatisch 50 € Rettungs-Chips
  const nextBalances: Record<string, number> = { ...state.balances };
  const nextRebuyBonuses: Record<string, number> = { ...state.rebuyBonuses };
  for (const p of players) {
    const bal = nextBalances[p.id] ?? 0;
    if (bal < MIN_RESCUE_THRESHOLD) {
      nextBalances[p.id] = bal + RESCUE_BONUS_AMOUNT;
      nextRebuyBonuses[p.id] = (nextRebuyBonuses[p.id] ?? 0) + RESCUE_BONUS_AMOUNT;
    }
  }

  const nextBets = Object.fromEntries(players.map((p) => [p.id, {}]));
  const nextOrder = Object.fromEntries(players.map((p) => [p.id, []]));

  return {
    ...state,
    round: state.round + 1,
    phase: 'betting',
    phaseEndsAt: now + state.betDuration * 1000,
    spinStartedAt: undefined,
    balances: nextBalances,
    rebuyBonuses: nextRebuyBonuses,
    bets: nextBets,
    betOrder: nextOrder,
    lockedPlayerIds: [],
    nextReadyIds: [],
    winningNumber: null,
    winningColor: null,
    scores: computeScores(nextBalances, nextBets),
  };
}

export const rouletteGame: MultiplayerGameDefinition<RouletteState, RouletteMove> = {
  id: 'roulette',
  title: 'Casino Roulette',
  minPlayers: 1,
  maxPlayers: 8,

  initGameState(
    players: Player[],
    starterId?: string,
    settings?: Record<string, any>
  ): RouletteState {
    if (players.length < 1) {
      throw new Error('Casino Roulette benötigt mindestens 1 Spieler.');
    }

    const maxRounds =
      typeof settings?.rounds === 'number' && settings.rounds >= 1 && settings.rounds <= 20
        ? Math.floor(settings.rounds)
        : 5;
    const betDuration =
      typeof settings?.roundDuration === 'number' &&
      settings.roundDuration >= 15 &&
      settings.roundDuration <= 180
        ? Math.floor(settings.roundDuration)
        : 30;
    const startingBalance =
      typeof settings?.startingBalance === 'number' &&
      settings.startingBalance >= 100 &&
      settings.startingBalance <= 100000
        ? Math.floor(settings.startingBalance)
        : 1000;

    const now = Date.now();
    const firstTurn =
      starterId && players.some((p) => p.id === starterId) ? starterId : players[0].id;

    const balances = Object.fromEntries(players.map((p) => [p.id, startingBalance]));
    const bets = Object.fromEntries(players.map((p) => [p.id, {}]));

    return {
      gameId: 'roulette',
      currentTurn: firstTurn,
      status: 'playing',
      winnerId: null,
      startedAt: now,
      round: 1,
      maxRounds,
      betDuration,
      startingBalance,
      phase: 'betting',
      phaseEndsAt: now + betDuration * 1000,
      balances,
      rebuyBonuses: Object.fromEntries(players.map((p) => [p.id, 0])),
      bets,
      betOrder: Object.fromEntries(players.map((p) => [p.id, []])),
      lastRoundBets: Object.fromEntries(players.map((p) => [p.id, {}])),
      lockedPlayerIds: [],
      nextReadyIds: [],
      winningNumber: null,
      winningColor: null,
      history: [],
      scores: { ...balances },
    };
  },

  validateAndApplyMove({ state, players, playerId, move }) {
    if (state.status !== 'playing') {
      return { valid: false, error: 'Das Spiel ist bereits beendet.', state };
    }

    const player = players.find((p) => p.id === playerId);
    if (!player) {
      return { valid: false, error: 'Spieler ist nicht aktiv.', state };
    }

    // 1. EINSATZ PLATZIEREN
    if (move.type === 'place_bet') {
      if (state.phase !== 'betting') {
        return { valid: false, error: 'Einsätze sind nur in der Setzphase möglich.', state };
      }
      if (state.lockedPlayerIds.includes(playerId)) {
        return { valid: false, error: 'Dein Einsatz ist bereits für diesen Spin bestätigt.', state };
      }
      if (!isValidBetKey(move.betKey)) {
        return { valid: false, error: 'Ungültiges Wettfeld.', state };
      }
      const amount = Math.floor(move.amount);
      if (!Number.isFinite(amount) || amount < 1) {
        return { valid: false, error: 'Ungültiger Einsatzbetrag.', state };
      }

      const balance = state.balances[playerId] ?? 0;
      if (amount > balance) {
        return { valid: false, error: 'Nicht genügend Guthaben für diesen Chip.', state };
      }

      const currentPlayerBets = { ...(state.bets[playerId] || {}) };
      if (!(move.betKey in currentPlayerBets) && Object.keys(currentPlayerBets).length >= 49) {
        return { valid: false, error: 'Maximale Anzahl Wettfelder erreicht.', state };
      }

      currentPlayerBets[move.betKey] = (currentPlayerBets[move.betKey] || 0) + amount;
      const nextBalances = { ...state.balances, [playerId]: balance - amount };
      const nextBets = { ...state.bets, [playerId]: currentPlayerBets };
      const nextOrder = {
        ...state.betOrder,
        [playerId]: [...(state.betOrder[playerId] || []), { betKey: move.betKey, amount }],
      };

      return {
        valid: true,
        state: {
          ...state,
          balances: nextBalances,
          bets: nextBets,
          betOrder: nextOrder,
          scores: computeScores(nextBalances, nextBets),
        },
      };
    }

    // 2. LETZTEN CHIP ZURÜCKNEHMEN (UNDO)
    if (move.type === 'undo_bet') {
      if (state.phase !== 'betting') {
        return { valid: true, state };
      }
      if (state.lockedPlayerIds.includes(playerId)) {
        return { valid: false, error: 'Einsatz ist bereits bestätigt.', state };
      }

      const stack = state.betOrder[playerId] || [];
      if (stack.length === 0) {
        return { valid: true, state };
      }

      const lastAction = stack[stack.length - 1];
      const nextStack = stack.slice(0, -1);
      const currentPlayerBets = { ...(state.bets[playerId] || {}) };
      const existing = currentPlayerBets[lastAction.betKey] || 0;
      const refund = Math.min(existing, lastAction.amount);

      if (existing - refund <= 0) {
        delete currentPlayerBets[lastAction.betKey];
      } else {
        currentPlayerBets[lastAction.betKey] = existing - refund;
      }

      const nextBalances = {
        ...state.balances,
        [playerId]: (state.balances[playerId] ?? 0) + refund,
      };
      const nextBets = { ...state.bets, [playerId]: currentPlayerBets };

      return {
        valid: true,
        state: {
          ...state,
          balances: nextBalances,
          bets: nextBets,
          betOrder: { ...state.betOrder, [playerId]: nextStack },
          scores: computeScores(nextBalances, nextBets),
        },
      };
    }

    // 3. ALLE EINSÄTZE DER RUNDE LÖSCHEN (CLEAR)
    if (move.type === 'clear_bets') {
      if (state.phase !== 'betting') {
        return { valid: true, state };
      }
      if (state.lockedPlayerIds.includes(playerId)) {
        return { valid: false, error: 'Einsatz ist bereits bestätigt.', state };
      }

      const refund = sumPlayerBets(state.bets[playerId]);
      if (refund === 0) return { valid: true, state };

      const nextBalances = {
        ...state.balances,
        [playerId]: (state.balances[playerId] ?? 0) + refund,
      };
      const nextBets = { ...state.bets, [playerId]: {} };

      return {
        valid: true,
        state: {
          ...state,
          balances: nextBalances,
          bets: nextBets,
          betOrder: { ...state.betOrder, [playerId]: [] },
          scores: computeScores(nextBalances, nextBets),
        },
      };
    }

    // 4. LETZTE RUNDE WIEDERHOLEN (REBET)
    if (move.type === 'rebet') {
      if (state.phase !== 'betting') {
        return { valid: false, error: 'Rebet nur in der Setzphase möglich.', state };
      }
      if (state.lockedPlayerIds.includes(playerId)) {
        return { valid: false, error: 'Einsatz ist bereits bestätigt.', state };
      }

      const prevBets = state.lastRoundBets[playerId] || {};
      const needed = sumPlayerBets(prevBets);
      if (needed <= 0) {
        return { valid: false, error: 'Keine vorherigen Einsätze zum Wiederholen.', state };
      }

      // Falls schon Einsätze liegen, erst zurückerstatten für sauberen Rebet
      const currentWager = sumPlayerBets(state.bets[playerId]);
      const availableTotal = (state.balances[playerId] ?? 0) + currentWager;
      if (needed > availableTotal) {
        return { valid: false, error: 'Nicht genügend Guthaben für Rebet.', state };
      }

      const clonedBets: Record<string, number> = {};
      const nextStack: Array<{ betKey: string; amount: number }> = [];
      for (const [k, v] of Object.entries(prevBets)) {
        if (v > 0 && isValidBetKey(k)) {
          clonedBets[k] = v;
          nextStack.push({ betKey: k, amount: v });
        }
      }

      const nextBalances = { ...state.balances, [playerId]: availableTotal - needed };
      const nextBets = { ...state.bets, [playerId]: clonedBets };

      return {
        valid: true,
        state: {
          ...state,
          balances: nextBalances,
          bets: nextBets,
          betOrder: { ...state.betOrder, [playerId]: nextStack },
          scores: computeScores(nextBalances, nextBets),
        },
      };
    }

    // 5. AKTUELLE EINSÄTZE VERDOPPELN (2x)
    if (move.type === 'double_bets') {
      if (state.phase !== 'betting') {
        return { valid: false, error: 'Verdoppeln nur in der Setzphase möglich.', state };
      }
      if (state.lockedPlayerIds.includes(playerId)) {
        return { valid: false, error: 'Einsatz ist bereits bestätigt.', state };
      }

      const currentPlayerBets = state.bets[playerId] || {};
      const currentWager = sumPlayerBets(currentPlayerBets);
      if (currentWager <= 0) {
        return { valid: false, error: 'Platziere zuerst mindestens einen Chip.', state };
      }
      const balance = state.balances[playerId] ?? 0;
      if (currentWager > balance) {
        return { valid: false, error: 'Nicht genügend Guthaben zum Verdoppeln.', state };
      }

      const doubledBets: Record<string, number> = {};
      const addedStack: Array<{ betKey: string; amount: number }> = [];
      for (const [k, v] of Object.entries(currentPlayerBets)) {
        if (v > 0) {
          doubledBets[k] = v * 2;
          addedStack.push({ betKey: k, amount: v });
        }
      }

      const nextBalances = { ...state.balances, [playerId]: balance - currentWager };
      const nextBets = { ...state.bets, [playerId]: doubledBets };

      return {
        valid: true,
        state: {
          ...state,
          balances: nextBalances,
          bets: nextBets,
          betOrder: {
            ...state.betOrder,
            [playerId]: [...(state.betOrder[playerId] || []), ...addedStack],
          },
          scores: computeScores(nextBalances, nextBets),
        },
      };
    }

    // 6. EINSATZ BESTÄTIGEN / DREHEN
    if (move.type === 'lock_bets') {
      if (state.phase !== 'betting') {
        return { valid: true, state };
      }

      const nextLocked = state.lockedPlayerIds.includes(playerId)
        ? state.lockedPlayerIds
        : [...state.lockedPlayerIds, playerId];
      const updated: RouletteState = { ...state, lockedPlayerIds: nextLocked };

      const allLocked = players.every((p) => nextLocked.includes(p.id));
      if (allLocked) {
        return { valid: true, state: transitionToSpinning(updated) };
      }
      return { valid: true, state: updated };
    }

    // 7. SPIN ABSCHLIESSEN (nach Ablauf von SPIN_DURATION_MS)
    if (move.type === 'finish_spin') {
      if (state.phase !== 'spinning') {
        return { valid: true, state };
      }
      if (Date.now() < state.phaseEndsAt - 1200) {
        return { valid: true, state };
      }
      return { valid: true, state: resolveSpinToResult(state, players) };
    }

    // 8. NÄCHSTE RUNDE (im Ergebnisbildschirm)
    if (move.type === 'next_round') {
      if (state.phase !== 'result') {
        return { valid: true, state };
      }

      const nextReady = state.nextReadyIds.includes(playerId)
        ? state.nextReadyIds
        : [...state.nextReadyIds, playerId];
      const updated: RouletteState = { ...state, nextReadyIds: nextReady };

      const allReady = players.every((p) => nextReady.includes(p.id));
      if (allReady) {
        return { valid: true, state: advanceAfterResult(updated, players) };
      }
      return { valid: true, state: updated };
    }

    // 9. TIMER ABGELAUFEN
    if (move.type === 'time_up') {
      const now = Date.now();
      if (now < state.phaseEndsAt - 1200) {
        return { valid: true, state };
      }
      if (state.phase === 'betting') {
        return { valid: true, state: transitionToSpinning(state, now) };
      }
      if (state.phase === 'spinning') {
        return { valid: true, state: resolveSpinToResult(state, players, now) };
      }
      if (state.phase === 'result') {
        return { valid: true, state: advanceAfterResult(state, players, now) };
      }
      return { valid: true, state };
    }

    return { valid: false, error: 'Unbekannte Roulette-Aktion.', state };
  },

  onPlayerLeave(state, leavingPlayerId, remainingPlayers) {
    if (state.status !== 'playing') return state;

    const nextLocked = state.lockedPlayerIds.filter((id) => id !== leavingPlayerId);
    const nextReady = state.nextReadyIds.filter((id) => id !== leavingPlayerId);

    const updated: RouletteState = {
      ...state,
      lockedPlayerIds: nextLocked,
      nextReadyIds: nextReady,
    };

    if (remainingPlayers.length === 0) {
      return updated;
    }

    if (updated.phase === 'betting' && remainingPlayers.every((p) => nextLocked.includes(p.id))) {
      return transitionToSpinning(updated);
    }

    if (updated.phase === 'result' && remainingPlayers.every((p) => nextReady.includes(p.id))) {
      return advanceAfterResult(updated, remainingPlayers);
    }

    return updated;
  },
};
