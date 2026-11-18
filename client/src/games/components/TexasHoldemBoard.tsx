import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Coins,
  Eye,
  EyeOff,
  Flame,
  Trophy,
  X,
} from 'lucide-react';
import type { GameRendererProps } from '../types';
import { Avatar } from '../../components/Avatar';
import { OpenButton } from '../../components/OpenSubpageUI';
import {
  playErrorSound,
  playMoveSound,
  playScoreSound,
  playWinSound,
  triggerHapticFeedback,
} from '../../utils/soundEffects';

export type CardSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export interface PokerCard {
  suit: CardSuit;
  rank: number;
}

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

export interface TexasHoldemState {
  gameId: 'texas-holdem';
  handNumber: number;
  maxHands: number;
  turnDuration: number;
  startingBalance: number;
  smallBlind: number;
  bigBlind: number;
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'game_over';
  phaseEndsAt: number;
  currentTurn: string;
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
  holeCards: Record<string, PokerCard[]>;
  communityCards: PokerCard[];
  foldedIds: string[];
  allInIds: string[];
  revealedPlayerIds: string[];
  nextReadyIds: string[];
  lastActions: Record<string, string>;
  lastActionText?: string;
  showdown?: PokerShowdownSummary;
  scores: Record<string, number>;
  winnerId?: string | null;
}

const PHASE_LABELS: Record<TexasHoldemState['phase'], string> = {
  preflop: 'PRE-FLOP',
  flop: 'FLOP',
  turn: 'TURN',
  river: 'RIVER',
  showdown: 'SHOWDOWN',
  game_over: 'SPIELENDE',
};

function formatEuro(amount: number): string {
  return `${Math.round(amount).toLocaleString('de-DE')} €`;
}

function formatSignedEuro(amount: number): string {
  const rounded = Math.round(amount);
  const abs = Math.abs(rounded).toLocaleString('de-DE');
  if (rounded > 0) return `+${abs} €`;
  if (rounded < 0) return `-${abs} €`;
  return `0 €`;
}

function formatCardRank(rank: number): string {
  switch (rank) {
    case 14:
      return 'A';
    case 13:
      return 'K';
    case 12:
      return 'D';
    case 11:
      return 'B';
    default:
      return String(rank);
  }
}

function getSuitSymbol(suit: CardSuit): string {
  switch (suit) {
    case 'spades':
      return '♠';
    case 'hearts':
      return '♥';
    case 'diamonds':
      return '♦';
    case 'clubs':
      return '♣';
  }
}

function formatRankPlural(rank: number): string {
  switch (rank) {
    case 14:
      return 'Asse';
    case 13:
      return 'Könige';
    case 12:
      return 'Damen';
    case 11:
      return 'Buben';
    default:
      return `${rank}er`;
  }
}

function encodePokerScore(category: number, tieBreakers: number[]): number {
  let score = category;
  for (let i = 0; i < 5; i++) {
    score = score * 15 + (tieBreakers[i] ?? 0);
  }
  return score;
}

function getStraightHigh(uniqueDesc: number[]): number | null {
  if (uniqueDesc.length !== 5) return null;
  if (uniqueDesc[0] - uniqueDesc[4] === 4) return uniqueDesc[0];
  if (
    uniqueDesc[0] === 14 &&
    uniqueDesc[1] === 5 &&
    uniqueDesc[2] === 4 &&
    uniqueDesc[3] === 3 &&
    uniqueDesc[4] === 2
  ) {
    return 5;
  }
  return null;
}

function evalFive(cards: PokerCard[]): { score: number; name: string } {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map((c) => c.rank);
  const isFlush = sorted.every((c) => c.suit === sorted[0].suit);
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) || 0) + 1);

  const groups = Array.from(counts.entries()).sort((a, b) =>
    b[1] !== a[1] ? b[1] - a[1] : b[0] - a[0]
  );
  const uniqueDesc = Array.from(counts.keys()).sort((a, b) => b - a);
  const straightHigh = getStraightHigh(uniqueDesc);

  if (isFlush && straightHigh !== null) {
    return {
      score: encodePokerScore(8, [straightHigh]),
      name: straightHigh === 14 ? 'Royal Flush' : 'Straight Flush',
    };
  }
  if (groups[0][1] === 4) {
    return {
      score: encodePokerScore(7, [groups[0][0], groups[1][0]]),
      name: `Vierling (${formatRankPlural(groups[0][0])})`,
    };
  }
  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return {
      score: encodePokerScore(6, [groups[0][0], groups[1][0]]),
      name: `Full House`,
    };
  }
  if (isFlush) {
    return {
      score: encodePokerScore(5, ranks),
      name: `Flush (${formatCardRank(ranks[0])} hoch)`,
    };
  }
  if (straightHigh !== null) {
    return {
      score: encodePokerScore(4, [straightHigh]),
      name: `Straße (${formatCardRank(straightHigh)} hoch)`,
    };
  }
  if (groups[0][1] === 3) {
    return {
      score: encodePokerScore(3, [groups[0][0], ...groups.slice(1).map((g) => g[0])]),
      name: `Drilling (${formatRankPlural(groups[0][0])})`,
    };
  }
  if (groups[0][1] === 2 && groups[1][1] === 2) {
    return {
      score: encodePokerScore(2, [groups[0][0], groups[1][0], groups[2][0]]),
      name: `Zwei Paare (${formatRankPlural(groups[0][0])} & ${formatRankPlural(groups[1][0])})`,
    };
  }
  if (groups[0][1] === 2) {
    return {
      score: encodePokerScore(1, [groups[0][0], ...groups.slice(1).map((g) => g[0])]),
      name: `Ein Paar (${formatRankPlural(groups[0][0])})`,
    };
  }
  return {
    score: encodePokerScore(0, ranks),
    name: `Höchste Karte (${formatCardRank(ranks[0])})`,
  };
}

function getClientHandDescription(cards: PokerCard[]): string {
  if (cards.length < 2) return '';
  if (cards.length < 5) {
    const sorted = [...cards].sort((a, b) => b.rank - a.rank);
    if (sorted.length === 2 && sorted[0].rank === sorted[1].rank) {
      return `Pocket Paar (${formatRankPlural(sorted[0].rank)})`;
    }
    return `Höchste Karte (${formatCardRank(sorted[0].rank)})`;
  }
  let best: { score: number; name: string } | null = null;
  const n = cards.length;
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            const cand = evalFive([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || cand.score > best.score) best = cand;
          }
        }
      }
    }
  }
  return best?.name || '';
}

function PlayingCard({
  card,
  faceDown = false,
  highlighted = false,
  dimmed = false,
  size = 'md',
}: {
  card?: PokerCard;
  faceDown?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const sizeClass =
    size === 'xs'
      ? 'h-9 w-6 rounded text-[9px]'
      : size === 'sm'
        ? 'h-12 w-8.5 rounded-md text-[11px]'
        : size === 'lg'
          ? 'h-20 w-14 sm:h-24 sm:w-16 rounded-xl text-sm sm:text-base'
          : 'h-16 w-11 sm:h-20 sm:w-14 rounded-lg text-xs sm:text-sm';

  if (faceDown || !card) {
    return (
      <div
        className={`relative flex shrink-0 items-center justify-center border border-[#F59E0B]/45 bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E1B4B] shadow-md select-none ${sizeClass} ${
          dimmed ? 'opacity-40' : ''
        }`}
      >
        <div className="h-[78%] w-[74%] rounded-[inherit] border border-[#FBBF24]/30 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.2)_0%,transparent_70%)] flex items-center justify-center">
          <span className="font-arcade text-[#FBBF24]/70 text-[10px]">◆</span>
        </div>
      </div>
    );
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const suitSym = getSuitSymbol(card.suit);
  const rankLabel = formatCardRank(card.rank);

  return (
    <div
      className={`relative flex shrink-0 flex-col justify-between border bg-[#F8FAFC] p-1 font-bold shadow-[0_8px_20px_rgba(0,0,0,0.45)] select-none ${sizeClass} ${
        isRed ? 'text-[#DC2626]' : 'text-[#0F172A]'
      } ${
        highlighted
          ? 'border-[#FDE047] ring-2 ring-[#FDE047] shadow-[0_0_16px_rgba(253,224,71,0.85)] -translate-y-0.5'
          : 'border-white/75'
      } ${dimmed ? 'opacity-45' : ''}`}
    >
      <div className="flex flex-col items-start leading-none">
        <span>{rankLabel}</span>
        <span className="text-[0.8em]">{suitSym}</span>
      </div>
      <div className="self-center text-[1.45em] leading-none">{suitSym}</div>
      <div className="flex flex-col items-end leading-none rotate-180">
        <span>{rankLabel}</span>
      </div>
    </div>
  );
}

function EmptyCardSlot({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass =
    size === 'sm'
      ? 'h-12 w-8.5 rounded-md'
      : size === 'lg'
        ? 'h-20 w-14 sm:h-24 sm:w-16 rounded-xl'
        : 'h-16 w-11 sm:h-20 sm:w-14 rounded-lg';

  return (
    <div
      className={`shrink-0 border border-dashed border-[#34D399]/35 bg-[#022C22]/45 ${sizeClass}`}
    />
  );
}

const EMPTY_POKER_CARDS: PokerCard[] = [];

export function TexasHoldemBoard({
  gameState,
  myPlayer,
  allPlayers,
  onMove,
  disabled,
}: GameRendererProps<TexasHoldemState>) {
  const isTvScreen = Boolean(myPlayer?.isTvScreen);
  const myId = myPlayer?.id || '';

  const phase = gameState?.phase ?? 'preflop';
  const handNumber = gameState?.handNumber ?? 1;
  const maxHands = gameState?.maxHands ?? 10;
  const smallBlind = gameState?.smallBlind ?? 10;
  const bigBlind = gameState?.bigBlind ?? 20;
  const pot = gameState?.pot ?? 0;
  const currentBet = gameState?.currentBet ?? 0;
  const minRaiseDelta = gameState?.minRaiseDelta ?? bigBlind;
  const rawCommunityCards = gameState?.communityCards;
  const communityCards = rawCommunityCards ?? EMPTY_POKER_CARDS;
  const seatOrder = gameState?.seatOrder;
  const showdown = gameState?.showdown;
  const holeCardsMap = gameState?.holeCards;
  const phaseEndsAt = gameState?.phaseEndsAt;
  const activeHandIds = gameState?.activeHandIds ?? [];
  const foldedSet = useMemo(() => new Set(gameState?.foldedIds ?? []), [gameState?.foldedIds]);
  const allInSet = useMemo(() => new Set(gameState?.allInIds ?? []), [gameState?.allInIds]);

  const [isCardsHidden, setIsCardsHidden] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() =>
    phaseEndsAt ? Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000)) : 0
  );

  const myBalance = gameState?.balances?.[myId] ?? 0;
  const myStreetBet = gameState?.streetBets?.[myId] ?? 0;
  const toCall = Math.max(0, currentBet - myStreetBet);
  const maxStreetBet = myStreetBet + myBalance;
  const minRaiseTarget = Math.min(maxStreetBet, currentBet + minRaiseDelta);

  const [customRaiseTarget, setCustomRaiseTarget] = useState<number>(minRaiseTarget);
  const effectiveRaiseTarget = Math.max(
    minRaiseTarget,
    Math.min(maxStreetBet, customRaiseTarget)
  );

  const sentTimeoutKeyRef = useRef<string | null>(null);
  const lastSoundTurnRef = useRef<string | null>(null);
  const lastShowdownSoundHandRef = useRef<number | null>(null);

  // Zug-Timer & automatischer Phasenfortschritt (auch bei AFK)
  useEffect(() => {
    if (!phaseEndsAt || phase === 'game_over') return;
    const key = `${handNumber}:${phase}:${gameState?.currentTurn}:${phaseEndsAt}`;

    const syncTimer = () => {
      const remainingMs = phaseEndsAt - Date.now();
      setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));

      if (!isTvScreen && !disabled && remainingMs <= 0 && sentTimeoutKeyRef.current !== key) {
        sentTimeoutKeyRef.current = key;
        onMove({ type: 'time_up' });
      }
    };

    const initId = setTimeout(syncTimer, 0);
    const interval = setInterval(syncTimer, 250);
    return () => {
      clearTimeout(initId);
      clearInterval(interval);
    };
  }, [phaseEndsAt, phase, handNumber, gameState?.currentTurn, isTvScreen, disabled, onMove]);

  // Dezenter Sound wenn man an der Reihe ist
  useEffect(() => {
    if (isTvScreen || phase === 'showdown' || phase === 'game_over') return;
    const turnKey = `${handNumber}:${phase}:${gameState?.currentTurn}`;
    if (gameState?.currentTurn === myId && lastSoundTurnRef.current !== turnKey) {
      lastSoundTurnRef.current = turnKey;
      playScoreSound(1);
      triggerHapticFeedback(12);
    }
  }, [gameState?.currentTurn, handNumber, phase, isTvScreen, myId]);

  // Showdown Win/Loss Sound einmal pro Hand
  useEffect(() => {
    if (isTvScreen || phase !== 'showdown' || !gameState?.showdown) return;
    if (lastShowdownSoundHandRef.current === gameState.showdown.handNumber) return;
    lastShowdownSoundHandRef.current = gameState.showdown.handNumber;

    const myRes = gameState.showdown.results[myId];
    if (!myRes) return;
    if (myRes.isWinner) {
      playWinSound();
      triggerHapticFeedback([18, 35, 25]);
    } else if (!myRes.folded && myRes.netProfit < 0) {
      playErrorSound();
    }
  }, [phase, isTvScreen, gameState?.showdown, myId]);

  const myHoleCards = useMemo(
    () => (holeCardsMap && holeCardsMap[myId]) || EMPTY_POKER_CARDS,
    [holeCardsMap, myId]
  );
  const myHandName = useMemo(
    () => getClientHandDescription([...myHoleCards, ...(rawCommunityCards ?? EMPTY_POKER_CARDS)]),
    [myHoleCards, rawCommunityCards]
  );

  const playerMap = useMemo(() => {
    const map = new Map(allPlayers.map((p) => [p.id, p]));
    return map;
  }, [allPlayers]);

  const orderedSeats = useMemo(() => {
    const order = seatOrder?.length ? seatOrder : allPlayers.map((p) => p.id);
    return order.filter((id) => playerMap.has(id));
  }, [seatOrder, allPlayers, playerMap]);

  const isMyTurn =
    !isTvScreen &&
    phase !== 'showdown' &&
    phase !== 'game_over' &&
    gameState?.currentTurn === myId &&
    activeHandIds.includes(myId) &&
    !foldedSet.has(myId) &&
    !allInSet.has(myId);

  const canRaise = isMyTurn && maxStreetBet > currentBet && myBalance > toCall;
  const nextReadyIds = gameState?.nextReadyIds ?? [];
  const isNextReady = nextReadyIds.includes(myId);

  const triggerPokerAction = (
    action: 'fold' | 'check' | 'call' | 'raise' | 'all_in',
    targetBet?: number
  ) => {
    if (!isMyTurn || disabled) return;
    playMoveSound();
    triggerHapticFeedback(10);
    onMove({ type: 'poker_action', action, targetBet });
  };

  const winningCardSet = useMemo(() => {
    const set = new Set<string>();
    if (phase === 'showdown' && showdown && !showdown.wonByFold) {
      for (const wid of showdown.winnerIds) {
        const cards = showdown.results[wid]?.bestCards || [];
        for (const c of cards) {
          set.add(`${c.suit}:${c.rank}`);
        }
      }
    }
    return set;
  }, [phase, showdown]);

  // ─── TV-ANSICHT: WOHNZIMMER-POKERTISCH MIT GEMEINSCHAFTSKARTEN & SHOWDOWN ───
  if (isTvScreen) {
    return (
      <div className="flex w-full flex-1 min-h-0 flex-col justify-between gap-3">
        {/* Obere Info-Zeile */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/12 bg-[#0F172A]/75 px-4 py-2 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="font-arcade rounded-md border border-[#34D399]/45 bg-[#10B981]/15 px-2.5 py-0.5 text-xs text-[#6EE7B7] uppercase">
              HAND #{handNumber}/{maxHands}
            </span>
            <span className="font-arcade text-xs text-[#CBD5E1] uppercase">
              BLINDS {smallBlind}/{bigBlind} €
            </span>
          </div>

          <span className="font-arcade text-xs sm:text-sm text-[#FDE68A] uppercase truncate">
            {gameState?.lastActionText || PHASE_LABELS[phase]}
          </span>

          <div className="flex items-center gap-2">
            <span className="font-arcade rounded-md border border-[#F59E0B]/45 bg-[#F59E0B]/15 px-2.5 py-0.5 text-xs text-[#FDE68A] uppercase">
              {PHASE_LABELS[phase]}
            </span>
            {phase !== 'game_over' && (
              <span className="font-arcade inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/[0.06] px-2.5 py-0.5 text-xs text-white">
                <Clock className="h-3 w-3" />
                {timeLeft}S
              </span>
            )}
          </div>
        </div>

        {/* Spielerplätze rund um den Tisch */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {orderedSeats.map((pid) => {
            const p = playerMap.get(pid);
            if (!p) return null;
            const bal = gameState?.balances?.[pid] ?? 0;
            const streetBet = gameState?.streetBets?.[pid] ?? 0;
            const inHand = activeHandIds.includes(pid);
            const isFolded = foldedSet.has(pid) || !inHand;
            const isActiveTurn = gameState?.currentTurn === pid && phase !== 'showdown';
            const isDealer = gameState?.dealerId === pid;
            const isSb = gameState?.smallBlindId === pid;
            const isBb = gameState?.bigBlindId === pid;
            const revealedCards = gameState?.holeCards?.[pid];
            const showResult = phase === 'showdown' ? gameState?.showdown?.results[pid] : undefined;
            const lastAction = gameState?.lastActions?.[pid];

            return (
              <div
                key={pid}
                className={`relative flex flex-col justify-between gap-2 rounded-2xl border p-3 transition-all ${
                  showResult?.isWinner
                    ? 'border-[#FDE047] bg-[#F59E0B]/20 shadow-[0_0_24px_rgba(253,224,71,0.35)]'
                    : isActiveTurn
                      ? 'border-[#34D399] bg-[#064E3B]/65 ring-2 ring-[#34D399]/60'
                      : isFolded
                        ? 'border-white/10 bg-white/[0.02] opacity-55'
                        : 'border-white/15 bg-[#0F172A]/75'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar config={p.avatar} size={32} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-arcade text-xs text-white uppercase truncate">
                          {p.name}
                        </span>
                        {isDealer && (
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#FBBF24] font-arcade text-[9px] text-[#0F172A]">
                            D
                          </span>
                        )}
                        {isSb && (
                          <span className="rounded bg-[#38BDF8]/25 px-1 font-arcade text-[9px] text-[#7DD3FC]">
                            SB
                          </span>
                        )}
                        {isBb && (
                          <span className="rounded bg-[#EC4899]/25 px-1 font-arcade text-[9px] text-[#F9A8D4]">
                            BB
                          </span>
                        )}
                      </div>
                      <div className="font-arcade text-xs text-[#FDE68A]">
                        {formatEuro(bal)}
                      </div>
                    </div>
                  </div>

                  {inHand && (
                    <div className="flex items-center gap-1 shrink-0">
                      {revealedCards && revealedCards.length === 2 ? (
                        revealedCards.map((c, idx) => (
                          <PlayingCard
                            key={idx}
                            card={c}
                            size="xs"
                            dimmed={isFolded}
                            highlighted={winningCardSet.has(`${c.suit}:${c.rank}`)}
                          />
                        ))
                      ) : (
                        <>
                          <PlayingCard faceDown size="xs" dimmed={isFolded} />
                          <PlayingCard faceDown size="xs" dimmed={isFolded} />
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 text-[10px] font-arcade uppercase">
                  <span className="text-[#94A3B8] truncate">
                    {showResult
                      ? showResult.handName
                      : lastAction || (isActiveTurn ? 'AM ZUG...' : inHand ? 'IM SPIEL' : 'RAUS')}
                  </span>
                  {showResult && showResult.wonAmount > 0 ? (
                    <span className="text-[#34D399] shrink-0">
                      +{formatEuro(showResult.wonAmount)}
                    </span>
                  ) : streetBet > 0 ? (
                    <span className="rounded bg-[#F59E0B]/20 px-1.5 py-0.5 text-[#FDE68A] shrink-0">
                      EINSATZ {streetBet} €
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Großer Pokertisch in der Mitte */}
        <div className="my-auto flex flex-col items-center justify-center gap-4 rounded-[32px] border-4 border-[#78350F] bg-gradient-to-br from-[#064E3B] via-[#065F46] to-[#022C22] p-5 sm:p-7 shadow-[0_24px_60px_rgba(0,0,0,0.65)] ring-1 ring-[#F59E0B]/40">
          <div className="flex items-center gap-2.5 rounded-full border border-[#FBBF24]/50 bg-[#0F172A]/80 px-5 py-1.5 shadow">
            <Coins className="h-4 w-4 text-[#FBBF24]" />
            <span className="font-arcade text-base sm:text-lg tracking-wider text-[#FDE68A] uppercase">
              POT: {formatEuro(pot)}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-3.5">
            {Array.from({ length: 5 }, (_, idx) => {
              const card = communityCards[idx];
              if (!card) return <EmptyCardSlot key={idx} size="lg" />;
              return (
                <PlayingCard
                  key={`${card.suit}-${card.rank}-${idx}`}
                  card={card}
                  size="lg"
                  highlighted={winningCardSet.has(`${card.suit}:${card.rank}`)}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── SPIELER-ANSICHT (STANDARD & TV-CONTROLLER) ───
  const showQuickPercentPot = (fraction: number) => {
    const suggested = Math.max(minRaiseTarget, Math.round((pot * fraction) / smallBlind) * smallBlind);
    return Math.min(maxStreetBet, suggested);
  };

  return (
    <div className="flex w-full max-w-4xl flex-1 min-h-0 flex-col justify-between gap-2 overflow-y-auto no-scrollbar py-0.5">
      {/* 1. Obere Poker-Leiste: Hand, Blinds, Zug-Timer */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-white/12 bg-[#0F172A]/75 px-3 py-1.5 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-arcade rounded-md border border-[#34D399]/40 bg-[#10B981]/15 px-2 py-0.5 text-[10px] text-[#6EE7B7] uppercase">
            HAND {handNumber}/{maxHands}
          </span>
          <span className="font-arcade text-[10px] text-[#94A3B8] uppercase">
            BLINDS {smallBlind}/{bigBlind}€
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-arcade rounded-md border border-[#F59E0B]/40 bg-[#F59E0B]/15 px-2 py-0.5 text-[10px] text-[#FDE68A] uppercase">
            {PHASE_LABELS[phase]}
          </span>
          {phase !== 'game_over' && (
            <span
              className={`font-arcade inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${
                isMyTurn && timeLeft <= 6
                  ? 'border-[#F87171]/60 bg-[#E11D48]/20 text-[#FECDD3] animate-pulse'
                  : 'border-white/15 bg-white/[0.06] text-white'
              }`}
            >
              <Clock className="h-3 w-3" />
              {timeLeft}S
            </span>
          )}
        </div>
      </div>

      {/* 2. Kompakte Mitspieler-Sitze */}
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {orderedSeats.map((pid) => {
          const p = playerMap.get(pid);
          if (!p) return null;
          const bal = gameState?.balances?.[pid] ?? 0;
          const streetBet = gameState?.streetBets?.[pid] ?? 0;
          const isFolded = foldedSet.has(pid) || !activeHandIds.includes(pid);
          const isActiveTurn = gameState?.currentTurn === pid && phase !== 'showdown';
          const isDealer = gameState?.dealerId === pid;
          const isSb = gameState?.smallBlindId === pid;
          const isBb = gameState?.bigBlindId === pid;
          const lastAct = gameState?.lastActions?.[pid];
          const showdownRes = phase === 'showdown' ? gameState?.showdown?.results[pid] : undefined;
          const shownCards = pid !== myId ? gameState?.holeCards?.[pid] : undefined;

          return (
            <div
              key={pid}
              className={`flex shrink-0 flex-col gap-1 rounded-xl border px-2.5 py-1.5 min-w-[116px] ${
                showdownRes?.isWinner
                  ? 'border-[#FDE047] bg-[#F59E0B]/20'
                  : isActiveTurn
                    ? 'border-[#34D399] bg-[#064E3B]/65 ring-1 ring-[#34D399]/70'
                    : isFolded
                      ? 'border-white/10 bg-white/[0.02] opacity-50'
                      : pid === myId
                        ? 'border-[#38BDF8]/45 bg-[#0F172A]/75'
                        : 'border-white/12 bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Avatar config={p.avatar} size={20} />
                  <span className="font-arcade text-[10px] text-white uppercase truncate max-w-[60px]">
                    {p.name}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {isDealer && (
                    <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#FBBF24] font-arcade text-[8px] text-[#0F172A]">
                      D
                    </span>
                  )}
                  {isSb && (
                    <span className="font-arcade text-[8px] text-[#7DD3FC]">SB</span>
                  )}
                  {isBb && (
                    <span className="font-arcade text-[8px] text-[#F9A8D4]">BB</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-1 font-arcade text-[10px]">
                <span className="text-[#FDE68A]">{formatEuro(bal)}</span>
                {showdownRes?.wonAmount ? (
                  <span className="text-[#34D399]">+{formatEuro(showdownRes.wonAmount)}</span>
                ) : streetBet > 0 ? (
                  <span className="text-[#CBD5E1]">{streetBet}€</span>
                ) : lastAct ? (
                  <span className="text-[#94A3B8]">{lastAct}</span>
                ) : null}
              </div>

              {shownCards && shownCards.length === 2 && (
                <div className="flex items-center gap-1 pt-0.5">
                  {shownCards.map((c, idx) => (
                    <PlayingCard
                      key={idx}
                      card={c}
                      size="xs"
                      highlighted={winningCardSet.has(`${c.suit}:${c.rank}`)}
                    />
                  ))}
                  {showdownRes && (
                    <span className="font-arcade text-[8px] text-[#FDE68A] truncate">
                      {showdownRes.handName}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Pokertisch-Mitte: Pot + Community Cards + Action Ticker */}
      <div className="my-auto flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-[#78350F] bg-gradient-to-br from-[#064E3B] via-[#065F46] to-[#022C22] p-3 sm:p-4 shadow-[0_14px_34px_rgba(0,0,0,0.45)] ring-1 ring-[#F59E0B]/30">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-[#FBBF24]/50 bg-[#0F172A]/85 px-3.5 py-1">
            <Coins className="h-3.5 w-3.5 text-[#FBBF24]" />
            <span className="font-arcade text-xs sm:text-sm text-[#FDE68A] uppercase">
              POT: {formatEuro(pot)}
            </span>
          </div>
          {gameState?.lastActionText && (
            <span className="font-arcade text-[11px] text-[#A7F3D0] uppercase text-center">
              {gameState.lastActionText}
            </span>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
          {Array.from({ length: 5 }, (_, idx) => {
            const card = communityCards[idx];
            if (!card) return <EmptyCardSlot key={idx} size="md" />;
            return (
              <PlayingCard
                key={`${card.suit}-${card.rank}-${idx}`}
                card={card}
                size="md"
                highlighted={winningCardSet.has(`${card.suit}:${card.rank}`)}
              />
            );
          })}
        </div>

        {/* Showdown-Gewinn-Übersicht */}
        {phase === 'showdown' && gameState?.showdown && (
          <div className="w-full max-w-lg rounded-xl border border-[#FDE047]/40 bg-[#0F172A]/85 px-3 py-2 text-center animate-fade-in">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Trophy className="h-4 w-4 text-[#FBBF24]" />
              <span className="font-arcade text-xs sm:text-sm text-[#FEF08A] uppercase">
                {gameState.showdown.winnerIds
                  .map((id) => playerMap.get(id)?.name || 'Spieler')
                  .join(' & ')}{' '}
                GEWINNT {formatEuro(gameState.showdown.potTotal)}!
              </span>
            </div>
            {gameState.showdown.results[myId] && (
              <p className="font-arcade mt-0.5 text-[11px] text-[#CBD5E1] uppercase">
                DEIN ERGEBNIS: {gameState.showdown.results[myId].handName} •{' '}
                <span
                  className={
                    gameState.showdown.results[myId].netProfit > 0
                      ? 'text-[#34D399]'
                      : gameState.showdown.results[myId].netProfit < 0
                        ? 'text-[#FCA5A5]'
                        : 'text-white'
                  }
                >
                  {formatSignedEuro(gameState.showdown.results[myId].netProfit)}
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* 4. Unten: Eigene Pocket-Karten + Poker-Aktionsleiste */}
      <div className="flex shrink-0 flex-col gap-2 rounded-2xl border border-white/15 bg-[#0F172A]/90 p-2.5 sm:p-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          {/* Eigene Karten */}
          <div className="flex items-center gap-2.5">
            {activeHandIds.includes(myId) ? (
              <>
                <div className="flex items-center gap-1.5">
                  {[0, 1].map((idx) => (
                    <PlayingCard
                      key={idx}
                      card={myHoleCards[idx]}
                      faceDown={isCardsHidden && phase !== 'showdown'}
                      size="md"
                      dimmed={foldedSet.has(myId)}
                      highlighted={
                        myHoleCards[idx]
                          ? winningCardSet.has(
                              `${myHoleCards[idx].suit}:${myHoleCards[idx].rank}`
                            )
                          : false
                      }
                    />
                  ))}
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-arcade text-xs text-[#FDE68A]">
                      {formatEuro(myBalance)}
                    </span>
                    {phase !== 'showdown' && (
                      <button
                        type="button"
                        onClick={() => setIsCardsHidden((prev) => !prev)}
                        title={isCardsHidden ? 'Karten aufdecken' : 'Karten verdecken (Sichtschutz)'}
                        className="inline-flex h-6 items-center gap-1 rounded-md border border-white/20 bg-white/[0.06] px-1.5 font-arcade text-[9px] text-white/80 uppercase hover:bg-white/12 cursor-pointer"
                      >
                        {isCardsHidden ? (
                          <>
                            <Eye className="h-3 w-3" />
                            <span>ZEIGEN</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" />
                            <span>TARNEN</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <span className="font-arcade text-[11px] text-[#6EE7B7] uppercase truncate max-w-[180px] sm:max-w-xs">
                    {foldedSet.has(myId)
                      ? 'AUSGESTIEGEN (FOLD)'
                      : isCardsHidden && phase !== 'showdown'
                        ? 'KARTEN VERDECKT'
                        : myHandName || 'DEINE HAND'}
                  </span>
                </div>
              </>
            ) : (
              <span className="font-arcade text-xs text-[#94A3B8] uppercase">
                KEINE CHIPS MEHR – ZUSCHAUERMODUS
              </span>
            )}
          </div>

          {phase === 'showdown' ? (
            <OpenButton
              size="md"
              variant="primary"
              disabled={isNextReady || Boolean(disabled)}
              onClick={() => onMove({ type: 'next_round' })}
            >
              {isNextReady
                ? `WARTE (${nextReadyIds.length})...`
                : handNumber >= maxHands
                  ? 'ENDERGEBNIS'
                  : 'NÄCHSTE HAND'}
            </OpenButton>
          ) : (
            <span
              className={`font-arcade rounded-lg border px-2.5 py-1 text-[10px] sm:text-xs uppercase shrink-0 ${
                isMyTurn
                  ? 'border-[#34D399]/60 bg-[#10B981]/20 text-[#6EE7B7]'
                  : 'border-white/15 bg-white/[0.04] text-[#94A3B8]'
              }`}
            >
              {isMyTurn
                ? 'DU BIST DRAN!'
                : `${playerMap.get(gameState?.currentTurn || '')?.name || 'MITSPIELER'} AM ZUG`}
            </span>
          )}
        </div>

        {/* Wett-Buttons wenn am Zug */}
        {isMyTurn && (
          <div className="flex flex-col gap-2 border-t border-white/12 pt-2">
            {canRaise && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setCustomRaiseTarget(minRaiseTarget)}
                    className="font-arcade rounded-md border border-white/20 bg-white/[0.06] px-2 py-1 text-[10px] text-white uppercase hover:bg-white/15 cursor-pointer"
                  >
                    MIN ({minRaiseTarget}€)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomRaiseTarget(showQuickPercentPot(0.5))}
                    className="font-arcade rounded-md border border-white/20 bg-white/[0.06] px-2 py-1 text-[10px] text-white uppercase hover:bg-white/15 cursor-pointer"
                  >
                    ½ POT
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomRaiseTarget(showQuickPercentPot(1))}
                    className="font-arcade rounded-md border border-white/20 bg-white/[0.06] px-2 py-1 text-[10px] text-white uppercase hover:bg-white/15 cursor-pointer"
                  >
                    POT
                  </button>
                </div>

                {maxStreetBet > minRaiseTarget && (
                  <input
                    type="range"
                    min={minRaiseTarget}
                    max={maxStreetBet}
                    step={Math.max(5, smallBlind)}
                    value={effectiveRaiseTarget}
                    onChange={(e) => setCustomRaiseTarget(Number(e.target.value))}
                    aria-label="Einsatzhöhe wählen"
                    className="flex-1 min-w-[110px] accent-[#F59E0B] cursor-pointer"
                  />
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <OpenButton
                size="sm"
                variant="rose"
                disabled={Boolean(disabled)}
                onClick={() => triggerPokerAction('fold')}
              >
                <X className="h-3.5 w-3.5" />
                <span>FOLD</span>
              </OpenButton>

              {toCall === 0 ? (
                <OpenButton
                  size="sm"
                  variant="secondary"
                  disabled={Boolean(disabled)}
                  onClick={() => triggerPokerAction('check')}
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>CHECK</span>
                </OpenButton>
              ) : (
                <OpenButton
                  size="sm"
                  variant="indigo"
                  disabled={Boolean(disabled)}
                  onClick={() => triggerPokerAction('call')}
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>
                    {myBalance <= toCall ? `ALL-IN ${myBalance}€` : `CALL ${toCall}€`}
                  </span>
                </OpenButton>
              )}

              {canRaise ? (
                <OpenButton
                  size="sm"
                  variant="primary"
                  disabled={Boolean(disabled)}
                  onClick={() => triggerPokerAction('raise', effectiveRaiseTarget)}
                >
                  <span>
                    {currentBet === 0 ? 'BET' : 'RAISE'} {effectiveRaiseTarget}€
                  </span>
                </OpenButton>
              ) : (
                <div className="hidden sm:block" />
              )}

              <OpenButton
                size="sm"
                variant="amber"
                disabled={Boolean(disabled) || myBalance <= 0}
                onClick={() => triggerPokerAction('all_in')}
              >
                <Flame className="h-3.5 w-3.5" />
                <span>ALL-IN ({maxStreetBet}€)</span>
              </OpenButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
