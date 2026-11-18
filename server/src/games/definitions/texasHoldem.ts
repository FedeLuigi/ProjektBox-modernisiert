import { BaseGameState, MultiplayerGameDefinition, Player } from '../../types/multiplayer.js';
import {
  createShuffledDeck,
  evaluateBestPokerHand,
  type PokerCard,
} from './pokerEvaluator.js';

export type PokerPhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'game_over';

export type PokerActionType = 'fold' | 'check' | 'call' | 'raise' | 'all_in';

export const SHOWDOWN_DURATION_MS = 9000;

export interface PokerShowdownPlayerResult {
  playerId: string;
  handName: string;
  wonAmount: number;
  netProfit: number;
  bestCards: PokerCard[];
  isWinner: boolean;
  folded: boolean;
}

export interface PokerShowdownSummary {
  handNumber: number;
  potTotal: number;
  wonByFold: boolean;
  winnerIds: string[];
  results: Record<string, PokerShowdownPlayerResult>;
}

export interface TexasHoldemState extends BaseGameState {
  gameId: 'texas-holdem';
  handNumber: number;
  maxHands: number;
  turnDuration: number;
  startingBalance: number;
  smallBlind: number;
  bigBlind: number;
  phase: PokerPhase;
  phaseEndsAt: number;
  seatOrder: string[];
  activeHandIds: string[];
  dealerId: string;
  smallBlindId: string;
  bigBlindId: string;
  pot: number;
  currentBet: number;
  minRaiseDelta: number;
  balances: Record<string, number>;
  streetBets: Record<string, number>;
  handContributions: Record<string, number>;
  handStartBalances: Record<string, number>;
  holeCards: Record<string, PokerCard[]>;
  communityCards: PokerCard[];
  deck?: PokerCard[]; // Streng serverseitig, wird für Clients entfernt
  foldedIds: string[];
  allInIds: string[];
  actedIds: string[];
  revealedPlayerIds: string[];
  nextReadyIds: string[];
  lastActions: Record<string, string>;
  lastActionText?: string;
  showdown?: PokerShowdownSummary;
  scores: Record<string, number>;
}

export type TexasHoldemMove =
  | { type: 'poker_action'; action: PokerActionType; targetBet?: number }
  | { type: 'next_round' }
  | { type: 'time_up' };

function getNextSeatInList(
  orderedIds: string[],
  afterId: string,
  predicate: (id: string) => boolean
): string | null {
  if (orderedIds.length === 0) return null;
  const startIdx = orderedIds.indexOf(afterId);
  const base = startIdx >= 0 ? startIdx : -1;
  for (let offset = 1; offset <= orderedIds.length; offset++) {
    const candidate = orderedIds[(base + offset) % orderedIds.length];
    if (predicate(candidate)) {
      return candidate;
    }
  }
  return null;
}

function getNextSeatFromIndex(
  orderedIds: string[],
  startExclusiveIdx: number,
  predicate: (id: string) => boolean
): string | null {
  if (orderedIds.length === 0) return null;
  for (let offset = 1; offset <= orderedIds.length; offset++) {
    const candidate = orderedIds[(startExclusiveIdx + offset) % orderedIds.length];
    if (predicate(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolvePotsAndShowdown(
  state: TexasHoldemState,
  now = Date.now(),
  wonByFold = false
): TexasHoldemState {
  const foldedSet = new Set(state.foldedIds);
  const aliveIds = state.activeHandIds.filter((id) => !foldedSet.has(id));

  // Sicherstellen, dass bei Showdown immer alle 5 Gemeinschaftskarten offen liegen (außer Sieg durch Fold)
  let community = [...state.communityCards];
  const deck = [...(state.deck || [])];
  if (!wonByFold) {
    while (community.length < 5 && deck.length > 0) {
      const card = deck.shift();
      if (card) community.push(card);
    }
  }

  const revealedPlayerIds = wonByFold ? [] : [...aliveIds];

  // Alle positiven Einsatzstufen für Haupt-Pot + Side-Pots ermitteln
  const positiveLevels = Array.from(
    new Set(
      Object.values(state.handContributions).filter((v) => typeof v === 'number' && v > 0)
    )
  ).sort((a, b) => a - b);

  const evaluations: Record<string, ReturnType<typeof evaluateBestPokerHand>> = {};
  if (!wonByFold) {
    for (const pid of aliveIds) {
      const cards = [...(state.holeCards[pid] || []), ...community];
      evaluations[pid] = evaluateBestPokerHand(cards);
    }
  }

  const nextBalances: Record<string, number> = { ...state.balances };
  const payouts: Record<string, number> = Object.fromEntries(
    state.activeHandIds.map((id) => [id, 0])
  );

  // Startindex nach dem Dealer für eventuelle Odd-Chip-Verteilung bei Split Pots
  const dealerIdx = Math.max(0, state.activeHandIds.indexOf(state.dealerId));
  const rotatedAfterDealer = [
    ...state.activeHandIds.slice(dealerIdx + 1),
    ...state.activeHandIds.slice(0, dealerIdx + 1),
  ];

  let prevLevel = 0;
  for (const level of positiveLevels) {
    let slicePot = 0;
    for (const pid of Object.keys(state.handContributions)) {
      const contrib = state.handContributions[pid] || 0;
      if (contrib > prevLevel) {
        slicePot += Math.min(contrib, level) - prevLevel;
      }
    }

    if (slicePot > 0) {
      const eligible = aliveIds.filter((id) => (state.handContributions[id] || 0) >= level);
      let sliceWinners: string[] = [];

      if (eligible.length === 1) {
        sliceWinners = [eligible[0]];
      } else if (eligible.length > 1) {
        let bestScore = -1;
        for (const pid of eligible) {
          const score = evaluations[pid]?.score ?? 0;
          if (score > bestScore) {
            bestScore = score;
            sliceWinners = [pid];
          } else if (score === bestScore) {
            sliceWinners.push(pid);
          }
        }
      }

      if (sliceWinners.length > 0) {
        const share = Math.floor(slicePot / sliceWinners.length);
        let remainder = slicePot - share * sliceWinners.length;

        const orderedWinners = rotatedAfterDealer.filter((id) => sliceWinners.includes(id));
        for (const wid of orderedWinners) {
          const bonus = remainder > 0 ? 1 : 0;
          if (remainder > 0) remainder -= 1;
          payouts[wid] = (payouts[wid] || 0) + share + bonus;
        }
      }
    }

    prevLevel = level;
  }

  // Fallback falls ungedeckter Pot ohne Contributions
  const totalDistributed = Object.values(payouts).reduce((sum, v) => sum + v, 0);
  if (totalDistributed < state.pot && aliveIds.length > 0) {
    payouts[aliveIds[0]] = (payouts[aliveIds[0]] || 0) + (state.pot - totalDistributed);
  }

  for (const [pid, won] of Object.entries(payouts)) {
    if (won > 0) {
      nextBalances[pid] = (nextBalances[pid] ?? 0) + won;
    }
  }

  const winnerIds = Object.entries(payouts)
    .filter(([, amt]) => amt > 0)
    .map(([pid]) => pid);

  const results: Record<string, PokerShowdownPlayerResult> = {};
  for (const pid of state.activeHandIds) {
    const startBal = state.handStartBalances[pid] ?? state.balances[pid] ?? 0;
    const endBal = nextBalances[pid] ?? 0;
    const isFolded = foldedSet.has(pid);
    const evalHand = evaluations[pid];

    results[pid] = {
      playerId: pid,
      handName: wonByFold
        ? isFolded
          ? 'Ausgestiegen'
          : 'Gegner ausgestiegen'
        : isFolded
          ? 'Ausgestiegen'
          : evalHand?.name || 'Hand',
      wonAmount: payouts[pid] || 0,
      netProfit: endBal - startBal,
      bestCards: evalHand?.bestCards || [],
      isWinner: winnerIds.includes(pid),
      folded: isFolded,
    };
  }

  const scores = { ...nextBalances };

  return {
    ...state,
    phase: 'showdown',
    phaseEndsAt: now + SHOWDOWN_DURATION_MS,
    currentTurn: '',
    balances: nextBalances,
    communityCards: community,
    deck,
    revealedPlayerIds,
    nextReadyIds: [],
    showdown: {
      handNumber: state.handNumber,
      potTotal: state.pot,
      wonByFold,
      winnerIds,
      results,
    },
    scores,
    lastActionText: wonByFold
      ? `Pot (${state.pot} €) ohne Showdown gewonnen!`
      : `Showdown um ${state.pot} €`,
  };
}

function finalizeToGameOver(state: TexasHoldemState): TexasHoldemState {
  const finalScores = { ...state.balances };
  const ranked = state.seatOrder
    .map((id) => ({ id, score: finalScores[id] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const topScore = ranked[0]?.score ?? 0;
  const topPlayers = ranked.filter((r) => r.score === topScore);
  const isDraw = ranked.length > 1 && topPlayers.length > 1;

  return {
    ...state,
    phase: 'game_over',
    status: isDraw ? 'draw' : 'won',
    winnerId: isDraw ? null : ranked[0]?.id || null,
    currentTurn: '',
    scores: finalScores,
  };
}

function dealNextHandOrEnd(
  prevState: TexasHoldemState,
  players: Player[],
  now = Date.now()
): TexasHoldemState {
  const activePlayerIds = new Set(players.map((p) => p.id));
  const seatsWithChips = prevState.seatOrder.filter(
    (id) => activePlayerIds.has(id) && (prevState.balances[id] ?? 0) > 0
  );

  if (seatsWithChips.length < 2 || prevState.handNumber >= prevState.maxHands) {
    return finalizeToGameOver(prevState);
  }

  const nextHandNumber = prevState.handNumber + 1;
  const prevDealerIdx = prevState.seatOrder.indexOf(prevState.dealerId);
  const dealerId =
    getNextSeatFromIndex(prevState.seatOrder, prevDealerIdx >= 0 ? prevDealerIdx : 0, (id) =>
      seatsWithChips.includes(id)
    ) || seatsWithChips[0];

  return setupHandState({
    baseState: prevState,
    handNumber: nextHandNumber,
    activeHandIds: seatsWithChips,
    dealerId,
    now,
  });
}

interface TexasHoldemBaseConfig {
  gameId: 'texas-holdem';
  currentTurn: string;
  status: 'playing' | 'won' | 'draw';
  winnerId: string | null;
  startedAt: number;
  maxHands: number;
  turnDuration: number;
  startingBalance: number;
  smallBlind: number;
  bigBlind: number;
  seatOrder: string[];
  balances: Record<string, number>;
  scores: Record<string, number>;
}

function setupHandState(params: {
  baseState: TexasHoldemBaseConfig;
  handNumber: number;
  activeHandIds: string[];
  dealerId: string;
  now: number;
}): TexasHoldemState {
  const { baseState, handNumber, activeHandIds, dealerId, now } = params;
  const isHeadsUp = activeHandIds.length === 2;

  const smallBlindId = isHeadsUp
    ? dealerId
    : getNextSeatInList(activeHandIds, dealerId, () => true) || activeHandIds[0];
  const bigBlindId =
    getNextSeatInList(activeHandIds, smallBlindId, () => true) ||
    activeHandIds[activeHandIds.length - 1];

  const deck = createShuffledDeck();
  const holeCards: Record<string, PokerCard[]> = {};
  for (const pid of activeHandIds) {
    const c1 = deck.shift()!;
    const c2 = deck.shift()!;
    holeCards[pid] = [c1, c2];
  }

  const balances = { ...baseState.balances };
  const handStartBalances: Record<string, number> = {};
  for (const pid of activeHandIds) {
    handStartBalances[pid] = balances[pid] ?? 0;
  }

  const streetBets: Record<string, number> = Object.fromEntries(activeHandIds.map((id) => [id, 0]));
  const handContributions: Record<string, number> = Object.fromEntries(
    activeHandIds.map((id) => [id, 0])
  );
  const allInIds: string[] = [];
  const lastActions: Record<string, string> = {};

  const sbAmount = Math.min(balances[smallBlindId] ?? 0, baseState.smallBlind);
  balances[smallBlindId] = (balances[smallBlindId] ?? 0) - sbAmount;
  streetBets[smallBlindId] += sbAmount;
  handContributions[smallBlindId] += sbAmount;
  lastActions[smallBlindId] = `SB ${sbAmount}`;
  if (balances[smallBlindId] <= 0) allInIds.push(smallBlindId);

  const bbAmount = Math.min(balances[bigBlindId] ?? 0, baseState.bigBlind);
  balances[bigBlindId] = (balances[bigBlindId] ?? 0) - bbAmount;
  streetBets[bigBlindId] += bbAmount;
  handContributions[bigBlindId] += bbAmount;
  lastActions[bigBlindId] = `BB ${bbAmount}`;
  if (balances[bigBlindId] <= 0 && !allInIds.includes(bigBlindId)) {
    allInIds.push(bigBlindId);
  }

  const pot = sbAmount + bbAmount;
  const currentBet = Math.max(sbAmount, bbAmount);
  const allInSet = new Set(allInIds);
  const ableToAct = activeHandIds.filter((id) => !allInSet.has(id));

  // Wer agiert zuerst Pre-Flop? Heads-Up: Dealer (SB); 3+: Spieler links vom BB
  const firstTurn = isHeadsUp
    ? ableToAct.includes(smallBlindId)
      ? smallBlindId
      : getNextSeatInList(activeHandIds, dealerId, (id) => ableToAct.includes(id))
    : getNextSeatInList(activeHandIds, bigBlindId, (id) => ableToAct.includes(id));

  const initialState: TexasHoldemState = {
    ...baseState,
    currentTurn: firstTurn || '',
    handNumber,
    phase: 'preflop',
    phaseEndsAt: now + baseState.turnDuration * 1000,
    activeHandIds,
    dealerId,
    smallBlindId,
    bigBlindId,
    pot,
    currentBet,
    minRaiseDelta: baseState.bigBlind,
    balances,
    streetBets,
    handContributions,
    handStartBalances,
    holeCards,
    communityCards: [],
    deck,
    foldedIds: [],
    allInIds,
    actedIds: [],
    revealedPlayerIds: [],
    nextReadyIds: [],
    lastActions,
    lastActionText: `Hand #${handNumber} gestartet`,
    showdown: undefined,
    scores: { ...balances },
  };

  // Falls bereits durch Blinds kein echtes Bieten mehr möglich ist -> direkt All-In Runout
  if (
    ableToAct.length === 0 ||
    (ableToAct.length === 1 && (streetBets[ableToAct[0]] || 0) >= currentBet)
  ) {
    return resolvePotsAndShowdown(initialState, now, false);
  }

  return initialState;
}

function advanceAfterAction(state: TexasHoldemState, actorId: string, now = Date.now()): TexasHoldemState {
  const foldedSet = new Set(state.foldedIds);
  const allInSet = new Set(state.allInIds);
  const actedSet = new Set(state.actedIds);

  const aliveIds = state.activeHandIds.filter((id) => !foldedSet.has(id));
  if (aliveIds.length <= 1) {
    return resolvePotsAndShowdown(state, now, true);
  }

  const ableToAct = aliveIds.filter((id) => !allInSet.has(id));
  const allMatched = ableToAct.every(
    (id) => actedSet.has(id) && (state.streetBets[id] || 0) >= state.currentBet
  );

  if (!allMatched) {
    const nextTurn = getNextSeatInList(
      state.activeHandIds,
      actorId,
      (id) =>
        !foldedSet.has(id) &&
        !allInSet.has(id) &&
        (!actedSet.has(id) || (state.streetBets[id] || 0) < state.currentBet)
    );
    if (nextTurn) {
      return {
        ...state,
        currentTurn: nextTurn,
        phaseEndsAt: now + state.turnDuration * 1000,
      };
    }
  }

  // Bietrunde abgeschlossen: All-In Runout prüfen oder nächste Street aufdecken
  if (ableToAct.length <= 1 || state.phase === 'river') {
    return resolvePotsAndShowdown(state, now, false);
  }

  const deck = [...(state.deck || [])];
  const community = [...state.communityCards];
  let nextPhase: PokerPhase = state.phase;
  let phaseLabel = '';

  if (state.phase === 'preflop') {
    nextPhase = 'flop';
    phaseLabel = 'Flop aufgedeckt';
    for (let i = 0; i < 3; i++) {
      const c = deck.shift();
      if (c) community.push(c);
    }
  } else if (state.phase === 'flop') {
    nextPhase = 'turn';
    phaseLabel = 'Turn aufgedeckt';
    const c = deck.shift();
    if (c) community.push(c);
  } else if (state.phase === 'turn') {
    nextPhase = 'river';
    phaseLabel = 'River aufgedeckt';
    const c = deck.shift();
    if (c) community.push(c);
  }

  const nextLastActions: Record<string, string> = {};
  for (const pid of state.activeHandIds) {
    if (foldedSet.has(pid)) nextLastActions[pid] = 'FOLD';
    else if (allInSet.has(pid)) nextLastActions[pid] = 'ALL-IN';
  }

  const nextActor =
    getNextSeatInList(
      state.activeHandIds,
      state.dealerId,
      (id) => !foldedSet.has(id) && !allInSet.has(id)
    ) || ableToAct[0];

  return {
    ...state,
    phase: nextPhase,
    phaseEndsAt: now + state.turnDuration * 1000,
    currentTurn: nextActor,
    currentBet: 0,
    minRaiseDelta: state.bigBlind,
    streetBets: Object.fromEntries(state.activeHandIds.map((id) => [id, 0])),
    actedIds: [],
    communityCards: community,
    deck,
    lastActions: nextLastActions,
    lastActionText: phaseLabel,
  };
}

export const texasHoldemGame: MultiplayerGameDefinition<TexasHoldemState, TexasHoldemMove> = {
  id: 'texas-holdem',
  title: "Poker Texas Hold'em",
  minPlayers: 2,
  maxPlayers: 8,

  initGameState(
    players: Player[],
    starterId?: string,
    settings?: Record<string, any>
  ): TexasHoldemState {
    if (players.length < 2) {
      throw new Error("Poker Texas Hold'em benötigt mindestens 2 Spieler.");
    }

    const maxHands =
      typeof settings?.rounds === 'number' && settings.rounds >= 1 && settings.rounds <= 30
        ? Math.floor(settings.rounds)
        : 10;
    const turnDuration =
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
    const smallBlind =
      typeof settings?.smallBlind === 'number' &&
      settings.smallBlind >= 5 &&
      settings.smallBlind <= 500
        ? Math.floor(settings.smallBlind)
        : 10;
    const bigBlind = smallBlind * 2;

    const now = Date.now();
    const seatOrder = players.map((p) => p.id);
    const dealerId =
      starterId && seatOrder.includes(starterId) ? starterId : seatOrder[0];
    const balances = Object.fromEntries(seatOrder.map((id) => [id, startingBalance]));

    return setupHandState({
      baseState: {
        gameId: 'texas-holdem',
        currentTurn: '',
        status: 'playing',
        winnerId: null,
        startedAt: now,
        maxHands,
        turnDuration,
        startingBalance,
        smallBlind,
        bigBlind,
        seatOrder,
        balances,
        scores: { ...balances },
      },
      handNumber: 1,
      activeHandIds: seatOrder,
      dealerId,
      now,
    });
  },

  validateAndApplyMove({ state, players, playerId, move }) {
    if (state.status !== 'playing') {
      return { valid: false, error: 'Das Spiel ist bereits beendet.', state };
    }

    const player = players.find((p) => p.id === playerId);
    if (!player) {
      return { valid: false, error: 'Spieler ist nicht aktiv.', state };
    }

    // 1. NÄCHSTE HAND BEIM SHOWDOWN
    if (move.type === 'next_round') {
      if (state.phase !== 'showdown') {
        return { valid: true, state };
      }

      const nextReady = state.nextReadyIds.includes(playerId)
        ? state.nextReadyIds
        : [...state.nextReadyIds, playerId];
      const updated: TexasHoldemState = { ...state, nextReadyIds: nextReady };

      const eligibleForNext = players.filter((p) => state.activeHandIds.includes(p.id));
      const gatePlayers = eligibleForNext.length > 0 ? eligibleForNext : players;

      if (gatePlayers.every((p) => nextReady.includes(p.id))) {
        return { valid: true, state: dealNextHandOrEnd(updated, players) };
      }
      return { valid: true, state: updated };
    }

    // 2. ZEIT ABGELAUFEN
    if (move.type === 'time_up') {
      const now = Date.now();
      if (now < state.phaseEndsAt - 1200) {
        return { valid: true, state };
      }
      if (state.phase === 'showdown') {
        return { valid: true, state: dealNextHandOrEnd(state, players, now) };
      }
      if (state.phase !== 'game_over' && state.currentTurn) {
        const timedOutId = state.currentTurn;
        const timedOutPlayer = players.find((p) => p.id === timedOutId);
        const myStreetBet = state.streetBets[timedOutId] || 0;
        const canCheck = myStreetBet >= state.currentBet;

        if (canCheck) {
          const nextState: TexasHoldemState = {
            ...state,
            actedIds: state.actedIds.includes(timedOutId)
              ? state.actedIds
              : [...state.actedIds, timedOutId],
            lastActions: { ...state.lastActions, [timedOutId]: 'CHECK' },
            lastActionText: `${timedOutPlayer?.name || 'Spieler'} checkt (Zeit)`,
          };
          return { valid: true, state: advanceAfterAction(nextState, timedOutId, now) };
        }

        const nextState: TexasHoldemState = {
          ...state,
          foldedIds: state.foldedIds.includes(timedOutId)
            ? state.foldedIds
            : [...state.foldedIds, timedOutId],
          actedIds: state.actedIds.includes(timedOutId)
            ? state.actedIds
            : [...state.actedIds, timedOutId],
          lastActions: { ...state.lastActions, [timedOutId]: 'FOLD' },
          lastActionText: `${timedOutPlayer?.name || 'Spieler'} foldet (Zeit)`,
        };
        return { valid: true, state: advanceAfterAction(nextState, timedOutId, now) };
      }
      return { valid: true, state };
    }

    // 3. POKER-SPIELAKTION (fold / check / call / raise / all_in)
    if (move.type === 'poker_action') {
      if (
        state.phase !== 'preflop' &&
        state.phase !== 'flop' &&
        state.phase !== 'turn' &&
        state.phase !== 'river'
      ) {
        return { valid: false, error: 'Aktuell ist keine Setzrunde aktiv.', state };
      }
      if (state.currentTurn !== playerId) {
        return { valid: false, error: 'Du bist aktuell nicht am Zug.', state };
      }
      if (!state.activeHandIds.includes(playerId) || state.foldedIds.includes(playerId)) {
        return { valid: false, error: 'Du bist in dieser Hand nicht mehr aktiv.', state };
      }
      if (state.allInIds.includes(playerId)) {
        return { valid: false, error: 'Du bist bereits All-In.', state };
      }

      const now = Date.now();
      const myBalance = state.balances[playerId] ?? 0;
      const myStreetBet = state.streetBets[playerId] ?? 0;
      const toCall = Math.max(0, state.currentBet - myStreetBet);

      if (move.action === 'fold') {
        const nextState: TexasHoldemState = {
          ...state,
          foldedIds: [...state.foldedIds, playerId],
          actedIds: state.actedIds.includes(playerId)
            ? state.actedIds
            : [...state.actedIds, playerId],
          lastActions: { ...state.lastActions, [playerId]: 'FOLD' },
          lastActionText: `${player.name} steigt aus`,
        };
        return { valid: true, state: advanceAfterAction(nextState, playerId, now) };
      }

      if (move.action === 'check') {
        if (toCall > 0) {
          return {
            valid: false,
            error: `Check nicht möglich – du musst ${toCall} € mitgehen oder erhöhen.`,
            state,
          };
        }
        const nextState: TexasHoldemState = {
          ...state,
          actedIds: state.actedIds.includes(playerId)
            ? state.actedIds
            : [...state.actedIds, playerId],
          lastActions: { ...state.lastActions, [playerId]: 'CHECK' },
          lastActionText: `${player.name} checkt`,
        };
        return { valid: true, state: advanceAfterAction(nextState, playerId, now) };
      }

      if (move.action === 'call') {
        if (toCall <= 0) {
          return { valid: false, error: 'Kein offener Einsatz zum Mitgehen vorhanden.', state };
        }
        const paid = Math.min(myBalance, toCall);
        const remaining = myBalance - paid;
        const isNowAllIn = remaining <= 0;

        const nextState: TexasHoldemState = {
          ...state,
          pot: state.pot + paid,
          balances: { ...state.balances, [playerId]: remaining },
          streetBets: { ...state.streetBets, [playerId]: myStreetBet + paid },
          handContributions: {
            ...state.handContributions,
            [playerId]: (state.handContributions[playerId] ?? 0) + paid,
          },
          allInIds:
            isNowAllIn && !state.allInIds.includes(playerId)
              ? [...state.allInIds, playerId]
              : state.allInIds,
          actedIds: state.actedIds.includes(playerId)
            ? state.actedIds
            : [...state.actedIds, playerId],
          lastActions: {
            ...state.lastActions,
            [playerId]: isNowAllIn ? 'ALL-IN' : `CALL ${paid}`,
          },
          lastActionText: isNowAllIn
            ? `${player.name} geht All-In (${myStreetBet + paid} €)`
            : `${player.name} geht mit (${paid} €)`,
          scores: { ...state.scores, [playerId]: remaining },
        };
        return { valid: true, state: advanceAfterAction(nextState, playerId, now) };
      }

      if (move.action === 'raise' || move.action === 'all_in') {
        if (myBalance <= 0) {
          return { valid: false, error: 'Keine Chips zum Setzen übrig.', state };
        }
        const maxPossibleStreetBet = myStreetBet + myBalance;
        const requestedTarget =
          move.action === 'all_in'
            ? maxPossibleStreetBet
            : Math.floor(move.targetBet ?? 0);

        if (!Number.isFinite(requestedTarget) || requestedTarget <= myStreetBet) {
          return { valid: false, error: 'Ungültige Einsatzhöhe.', state };
        }

        const actualTarget = Math.min(maxPossibleStreetBet, requestedTarget);
        const isAllInMove = actualTarget >= maxPossibleStreetBet;

        // Falls All-In nicht einmal den currentBet übersteigt -> regulärer All-In Call
        if (actualTarget <= state.currentBet) {
          if (!isAllInMove) {
            return {
              valid: false,
              error: `Erhöhung muss über ${state.currentBet} € liegen.`,
              state,
            };
          }
          const paid = myBalance;
          const nextState: TexasHoldemState = {
            ...state,
            pot: state.pot + paid,
            balances: { ...state.balances, [playerId]: 0 },
            streetBets: { ...state.streetBets, [playerId]: actualTarget },
            handContributions: {
              ...state.handContributions,
              [playerId]: (state.handContributions[playerId] ?? 0) + paid,
            },
            allInIds: [...state.allInIds, playerId],
            actedIds: state.actedIds.includes(playerId)
              ? state.actedIds
              : [...state.actedIds, playerId],
            lastActions: { ...state.lastActions, [playerId]: 'ALL-IN' },
            lastActionText: `${player.name} geht All-In (${actualTarget} €)`,
            scores: { ...state.scores, [playerId]: 0 },
          };
          return { valid: true, state: advanceAfterAction(nextState, playerId, now) };
        }

        const minFullRaiseTarget = state.currentBet + state.minRaiseDelta;
        if (!isAllInMove && actualTarget < minFullRaiseTarget) {
          return {
            valid: false,
            error: `Mindesterhöhung beträgt ${minFullRaiseTarget} €.`,
            state,
          };
        }

        const added = actualTarget - myStreetBet;
        const remaining = myBalance - added;
        const raiseDelta = actualTarget - state.currentBet;
        const isFullRaise = raiseDelta >= state.minRaiseDelta;
        const nextMinRaiseDelta = isFullRaise ? raiseDelta : state.minRaiseDelta;
        const nextActed = isFullRaise
          ? [playerId]
          : state.actedIds.includes(playerId)
            ? state.actedIds
            : [...state.actedIds, playerId];

        const verb = state.currentBet === 0 ? 'setzt' : 'erhöht auf';
        const badge = isAllInMove
          ? 'ALL-IN'
          : state.currentBet === 0
            ? `BET ${actualTarget}`
            : `RAISE ${actualTarget}`;

        const nextState: TexasHoldemState = {
          ...state,
          pot: state.pot + added,
          currentBet: actualTarget,
          minRaiseDelta: nextMinRaiseDelta,
          balances: { ...state.balances, [playerId]: remaining },
          streetBets: { ...state.streetBets, [playerId]: actualTarget },
          handContributions: {
            ...state.handContributions,
            [playerId]: (state.handContributions[playerId] ?? 0) + added,
          },
          allInIds:
            isAllInMove && !state.allInIds.includes(playerId)
              ? [...state.allInIds, playerId]
              : state.allInIds,
          actedIds: nextActed,
          lastActions: { ...state.lastActions, [playerId]: badge },
          lastActionText: isAllInMove
            ? `${player.name} geht All-In (${actualTarget} €)`
            : `${player.name} ${verb} ${actualTarget} €`,
          scores: { ...state.scores, [playerId]: remaining },
        };
        return { valid: true, state: advanceAfterAction(nextState, playerId, now) };
      }
    }

    return { valid: false, error: 'Unbekannte Poker-Aktion.', state };
  },

  onPlayerLeave(state, leavingPlayerId, remainingPlayers) {
    if (state.status !== 'playing') return state;

    const updatedBalances = { ...state.balances, [leavingPlayerId]: 0 };
    const nextReadyIds = state.nextReadyIds.filter((id) => id !== leavingPlayerId);

    // Weniger als 2 aktive Spieler im Turnier -> Gewinner bestimmen
    const remainingIds = new Set(remainingPlayers.map((p) => p.id));
    const remainingWithChips = state.seatOrder.filter(
      (id) => remainingIds.has(id) && (updatedBalances[id] ?? 0) > 0
    );

    if (state.phase === 'showdown') {
      const updated: TexasHoldemState = {
        ...state,
        balances: updatedBalances,
        nextReadyIds,
        scores: { ...updatedBalances },
      };
      if (remainingWithChips.length < 2) {
        return finalizeToGameOver(updated);
      }
      const eligibleForNext = remainingPlayers.filter((p) => state.activeHandIds.includes(p.id));
      const gatePlayers = eligibleForNext.length > 0 ? eligibleForNext : remainingPlayers;
      if (gatePlayers.every((p) => nextReadyIds.includes(p.id))) {
        return dealNextHandOrEnd(updated, remainingPlayers);
      }
      return updated;
    }

    const nextFolded = state.foldedIds.includes(leavingPlayerId)
      ? state.foldedIds
      : [...state.foldedIds, leavingPlayerId];
    const nextActed = state.actedIds.includes(leavingPlayerId)
      ? state.actedIds
      : [...state.actedIds, leavingPlayerId];

    const updated: TexasHoldemState = {
      ...state,
      balances: updatedBalances,
      foldedIds: nextFolded,
      actedIds: nextActed,
      nextReadyIds,
      lastActions: { ...state.lastActions, [leavingPlayerId]: 'VERLASSEN' },
      scores: { ...updatedBalances },
    };

    const foldedSet = new Set(nextFolded);
    const allInSet = new Set(state.allInIds);
    const actedSet = new Set(nextActed);
    const aliveIds = state.activeHandIds.filter((id) => !foldedSet.has(id));
    const ableToAct = aliveIds.filter((id) => !allInSet.has(id));
    const streetDone =
      aliveIds.length <= 1 ||
      ableToAct.length === 0 ||
      ableToAct.every(
        (id) => actedSet.has(id) && (state.streetBets[id] || 0) >= state.currentBet
      );

    // Wenn ein anderer Spieler geht und der aktuell aktive Spieler noch am Zug ist, Zug behalten
    if (
      !streetDone &&
      state.currentTurn &&
      state.currentTurn !== leavingPlayerId &&
      ableToAct.includes(state.currentTurn)
    ) {
      return updated;
    }

    const advanced = advanceAfterAction(updated, leavingPlayerId);
    if (remainingWithChips.length < 2 && advanced.phase === 'showdown') {
      return finalizeToGameOver(advanced);
    }
    return advanced;
  },
};
