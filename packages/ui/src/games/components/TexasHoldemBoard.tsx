import { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
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
import type {
  CardSuit,
  PokerCard,
  PokerShowdownPlayerResult,
  PokerShowdownSummary,
  TexasHoldemState,
} from '@projektbox/shared/types';
import {
  evaluateBestPokerHand,
  formatRankLabel as formatCardRank,
  getSuitSymbol,
  POKER_PHASE_LABELS as PHASE_LABELS,
} from '@projektbox/shared/utils';
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

export type {
  CardSuit,
  PokerCard,
  PokerShowdownPlayerResult,
  PokerShowdownSummary,
  TexasHoldemState,
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

function getClientHandDescription(cards: PokerCard[]): string {
  return evaluateBestPokerHand(cards)?.name ?? '';
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
      ? 'h-9.5 w-6.5 rounded text-[9px] leading-none'
      : size === 'sm'
        ? 'h-12 w-8.5 rounded-md text-[10px] leading-none'
        : size === 'lg'
          ? 'h-12 w-8.5 min-[480px]:h-14 min-[480px]:w-10 landscape:h-11 landscape:w-8 md:h-20 md:w-14 xl:h-24 xl:w-16 rounded-lg md:rounded-xl text-[10px] landscape:text-[9px] md:text-sm xl:text-base leading-none'
          : 'poker-landscape-card h-15 w-10.5 sm:h-18 sm:w-12.5 rounded-lg text-[11px] sm:text-sm landscape:text-[10px] leading-none';

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
      className={`relative flex shrink-0 flex-col justify-between overflow-hidden border bg-[#F8FAFC] p-[2px] sm:p-1 landscape:p-[2px] font-bold shadow-[0_8px_20px_rgba(0,0,0,0.45)] select-none ${sizeClass} ${
        isRed ? 'text-[#DC2626]' : 'text-[#0F172A]'
      } ${
        highlighted
          ? 'border-[#FDE047] ring-2 ring-[#FDE047] shadow-[0_0_16px_rgba(253,224,71,0.85)] -translate-y-0.5'
          : 'border-white/75'
      } ${dimmed ? 'opacity-45' : ''}`}
    >
      <div className="flex flex-col items-start leading-[0.88]">
        <span>{rankLabel}</span>
        {size !== 'xs' && <span className="text-[0.75em]">{suitSym}</span>}
      </div>
      <div className="self-center text-[1.18em] leading-none">{suitSym}</div>
      {size !== 'xs' ? (
        <div className="flex flex-col items-end leading-[0.88] rotate-180">
          <span>{rankLabel}</span>
        </div>
      ) : (
        <div className="h-[1px]" aria-hidden="true" />
      )}
    </div>
  );
}

function EmptyCardSlot({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass =
    size === 'sm'
      ? 'h-12 w-8.5 rounded-md'
      : size === 'lg'
        ? 'h-12 w-8.5 min-[480px]:h-14 min-[480px]:w-10 landscape:h-11 landscape:w-8 md:h-20 md:w-14 xl:h-24 xl:w-16 rounded-lg md:rounded-xl'
        : 'poker-landscape-slot h-15 w-10.5 sm:h-18 sm:w-12.5 rounded-lg';

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

  const sentTimeoutRef = useRef<{ key: string; sentAt: number } | null>(null);
  const lastSoundTurnRef = useRef<string | null>(null);
  const lastShowdownSoundHandRef = useRef<number | null>(null);

  // Zug-Timer & automatischer Phasenfortschritt (auch bei AFK)
  useEffect(() => {
    if (!phaseEndsAt || phase === 'game_over') return;
    const key = `${handNumber}:${phase}:${gameState?.currentTurn}:${phaseEndsAt}`;

    const syncTimer = () => {
      const remainingMs = phaseEndsAt - Date.now();
      setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));

      if (
        !isTvScreen &&
        !disabled &&
        remainingMs <= 0 &&
        (!sentTimeoutRef.current ||
          sentTimeoutRef.current.key !== key ||
          Date.now() - sentTimeoutRef.current.sentAt >= 1600)
      ) {
        sentTimeoutRef.current = { key, sentAt: Date.now() };
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
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FBBF24', '#FDE047', '#34D399', '#FB7185'],
      });
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
      <div className="flex w-full flex-1 min-h-0 flex-col justify-between gap-2 sm:gap-3 landscape:gap-1">
        {/* Obere Info-Zeile */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-0.5">
          <div className="flex items-center gap-2.5">
            <span className="font-arcade text-xs text-[#6EE7B7] uppercase whitespace-nowrap">
              HAND #{handNumber}/{maxHands}
            </span>
            <span className="font-arcade text-xs text-[#CBD5E1] uppercase whitespace-nowrap">
              BLINDS {smallBlind}/{bigBlind} €
            </span>
          </div>

          <span className="font-casino text-sm sm:text-base font-bold text-[#FDE68A] tracking-wide uppercase truncate">
            {gameState?.lastActionText || PHASE_LABELS[phase]}
          </span>

          <div className="flex items-center gap-2.5">
            <span className="font-arcade text-xs text-[#FDE68A] uppercase">
              {PHASE_LABELS[phase]}
            </span>
            {phase !== 'game_over' && (
              <span className="font-arcade inline-flex items-center gap-1 text-xs text-white">
                <Clock className="h-3 w-3" />
                {timeLeft}S
              </span>
            )}
          </div>
        </div>

        {/* Spielerplätze rund um den Tisch */}
        <div className="grid grid-cols-2 sm:grid-cols-4 landscape:grid-cols-4 gap-2 sm:gap-3 landscape:gap-1.5">
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
                className={`relative flex flex-col justify-between gap-1 px-1.5 py-1 transition-all ${
                  showResult?.isWinner
                    ? 'border-b-2 border-[#FDE047]'
                    : isActiveTurn
                      ? 'border-b-2 border-[#34D399]'
                      : isFolded
                        ? 'opacity-45'
                        : ''
                }`}
              >
                {/* Reihe 1: Avatar + Name (volle Breite ohne Karten-Konkurrenz) + Position */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`inline-flex shrink-0 rounded-full ${
                      showResult?.isWinner
                        ? 'ring-2 ring-[#FDE047]'
                        : isActiveTurn
                          ? 'ring-2 ring-[#34D399]'
                          : ''
                    }`}
                  >
                    <Avatar config={p.avatar} size={24} />
                  </span>
                  <span
                    className={`font-arcade text-[11px] sm:text-xs uppercase truncate min-w-0 flex-1 ${
                      showResult?.isWinner
                        ? 'text-[#FDE047]'
                        : isActiveTurn
                          ? 'text-[#6EE7B7]'
                          : 'text-white'
                    }`}
                  >
                    {p.name}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {isDealer && (
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#FBBF24] font-arcade text-[9px] text-[#0F172A]">
                        D
                      </span>
                    )}
                    {isSb && <span className="font-arcade text-[9px] text-[#7DD3FC]">SB</span>}
                    {isBb && <span className="font-arcade text-[9px] text-[#F9A8D4]">BB</span>}
                  </div>
                </div>

                {/* Reihe 2: Guthaben (ohne Umbruch) + Hole-Karten */}
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-arcade text-[11px] sm:text-xs text-[#FDE68A] whitespace-nowrap">
                    {formatEuro(bal)}
                  </span>

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

                {/* Reihe 3: Aktion / Gewinn / Einsatz */}
                <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] font-arcade uppercase">
                  <span className="text-[#94A3B8] truncate">
                    {showResult
                      ? showResult.handName
                      : lastAction || (isActiveTurn ? 'AM ZUG...' : inHand ? 'IM SPIEL' : 'RAUS')}
                  </span>
                  {showResult && showResult.wonAmount > 0 ? (
                    <span className="text-[#34D399] shrink-0 whitespace-nowrap">
                      +{formatEuro(showResult.wonAmount)}
                    </span>
                  ) : streetBet > 0 ? (
                    <span className="text-[#FDE68A] shrink-0 whitespace-nowrap">
                      {streetBet} €
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Großer Pokertisch in der Mitte */}
        <div className="my-auto flex flex-col items-center justify-center gap-2 sm:gap-4 landscape:gap-1 rounded-2xl sm:rounded-[32px] border-2 sm:border-4 border-[#78350F] bg-gradient-to-br from-[#064E3B] via-[#065F46] to-[#022C22] p-2.5 sm:p-5 landscape:p-1.5 lg:p-7 ring-1 ring-[#F59E0B]/40">
          <div className="flex items-center gap-2.5 px-1">
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
    <div className="poker-landscape-shell flex w-full max-w-5xl flex-1 min-h-0 flex-col justify-between gap-2 overflow-hidden py-0.5">
      {/* LINKE SPALTE IM QUERFORMAT (OBEN IM HOCHFORMAT): STATUS, SPIELER & TISCH */}
      <div className="poker-landscape-left flex flex-1 min-h-0 flex-col justify-between gap-1.5">
        {/* 1. Kompakte Hand/Blind/Timer-Leiste + Spieler-Chips */}
        <div className="flex shrink-0 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 px-0.5 py-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-arcade text-[10px] text-[#6EE7B7] uppercase">
                HAND {handNumber}/{maxHands}
              </span>
              <span className="font-arcade text-[10px] text-[#94A3B8] uppercase">
                {smallBlind}/{bigBlind}€
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="font-arcade text-[10px] text-[#FDE68A] uppercase">
                {PHASE_LABELS[phase]}
              </span>
              {phase !== 'game_over' && (
                <span
                  className={`font-arcade inline-flex items-center gap-1 text-[11px] ${
                    isMyTurn && timeLeft <= 6 ? 'text-[#FDA4AF] animate-pulse' : 'text-white/90'
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  {timeLeft}S
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 min-[300px]:grid-cols-4 sm:flex sm:flex-wrap sm:items-center sm:justify-center gap-1 sm:gap-2.5 px-0.5">
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
                  className={`flex min-w-0 flex-col gap-0.5 px-1 py-0.5 sm:min-w-[82px] transition-opacity ${
                    showdownRes?.isWinner
                      ? 'border-b-2 border-[#FDE047]'
                      : isActiveTurn
                        ? 'border-b-2 border-[#34D399]'
                        : isFolded
                          ? 'opacity-45'
                          : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span
                        className={`inline-flex rounded-full ${
                          showdownRes?.isWinner
                            ? 'ring-2 ring-[#FDE047]'
                            : isActiveTurn
                              ? 'ring-2 ring-[#34D399]'
                              : ''
                        }`}
                      >
                        <Avatar config={p.avatar} size={16} />
                      </span>
                      <span
                        className={`font-arcade text-[9px] uppercase truncate max-w-[58px] ${
                          showdownRes?.isWinner
                            ? 'text-[#FDE047]'
                            : isActiveTurn
                              ? 'text-[#6EE7B7]'
                              : pid === myId
                                ? 'text-[#7DD3FC]'
                                : 'text-white'
                        }`}
                      >
                        {p.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {isDealer && (
                        <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-[#FBBF24] font-arcade text-[7px] text-[#0F172A]">
                          D
                        </span>
                      )}
                      {isSb && <span className="font-arcade text-[8px] text-[#7DD3FC]">SB</span>}
                      {isBb && <span className="font-arcade text-[8px] text-[#F9A8D4]">BB</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1 font-arcade text-[9px]">
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Pokertisch-Mitte: Pot + 5 Community Cards + kompaktes Ergebnis */}
        <div className="poker-landscape-table my-auto flex w-full md:flex-1 min-h-0 flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-[#78350F] bg-gradient-to-br from-[#064E3B] via-[#065F46] to-[#022C22] px-3 py-6 sm:px-4 sm:py-7 md:p-3.5 ring-1 ring-[#F59E0B]/30">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-1.5 px-1">
              <Coins className="h-3.5 w-3.5 text-[#FBBF24]" />
              <span className="font-arcade text-xs text-[#FDE68A] uppercase">
                POT {formatEuro(pot)}
              </span>
            </div>
            {phase === 'showdown' && gameState?.showdown ? (
              <span className="font-arcade flex items-center gap-1 text-[11px] text-[#FEF08A] uppercase text-center">
                <Trophy className="h-3.5 w-3.5 text-[#FBBF24] shrink-0" />
                <span>
                  {gameState.showdown.winnerIds
                    .map((id) => playerMap.get(id)?.name || 'Spieler')
                    .join(' & ')}{' '}
                  +{formatEuro(gameState.showdown.potTotal)}
                </span>
              </span>
            ) : (
              gameState?.lastActionText && (
                <span className="font-arcade text-[10px] text-[#A7F3D0] uppercase text-center truncate max-w-[230px]">
                  {gameState.lastActionText}
                </span>
              )
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
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
        </div>
      </div>

      {/* RECHTE SPALTE IM QUERFORMAT (UNTEN IM HOCHFORMAT): EIGENE KARTEN & AKTIONEN */}
      <div className="poker-landscape-right flex shrink-0 flex-col justify-between gap-2 px-0.5 py-0.5">
        <div className="flex items-center justify-between gap-2">
          {/* Eigene Pocket-Karten */}
          <div className="flex items-center gap-2 min-w-0">
            {activeHandIds.includes(myId) ? (
              <>
                <div className="flex items-center gap-1.5 shrink-0">
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
                  <span className="font-arcade text-[11px] text-[#6EE7B7] uppercase truncate">
                    {foldedSet.has(myId)
                      ? 'FOLD'
                      : isCardsHidden && phase !== 'showdown'
                        ? 'VERDECKT'
                        : myHandName || 'HAND'}
                  </span>
                  {phase !== 'showdown' && (
                    <button
                      type="button"
                      onClick={() => setIsCardsHidden((prev) => !prev)}
                      title={isCardsHidden ? 'Karten zeigen' : 'Karten verdecken'}
                      className="inline-flex h-6 self-start items-center gap-1 rounded-md border border-white/20 bg-white/[0.06] px-1.5 font-arcade text-[9px] text-white/80 uppercase hover:bg-white/12 cursor-pointer"
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
                  {phase === 'showdown' && gameState?.showdown?.results[myId] && (
                    <span
                      className={`font-arcade text-[11px] uppercase ${
                        gameState.showdown.results[myId].netProfit > 0
                          ? 'text-[#34D399]'
                          : gameState.showdown.results[myId].netProfit < 0
                            ? 'text-[#FCA5A5]'
                            : 'text-[#CBD5E1]'
                      }`}
                    >
                      {formatSignedEuro(gameState.showdown.results[myId].netProfit)}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <span className="font-arcade text-[10px] text-[#94A3B8] uppercase">
                ZUSCHAUERMODUS
              </span>
            )}
          </div>

          {phase === 'showdown' ? (
            <OpenButton
              size="sm"
              variant="primary"
              disabled={isNextReady || Boolean(disabled)}
              onClick={() => onMove({ type: 'next_round' })}
              className="shrink-0"
            >
              {isNextReady
                ? `WARTE (${nextReadyIds.length})...`
                : handNumber >= maxHands
                  ? 'ENDE'
                  : 'WEITER'}
            </OpenButton>
          ) : (
            <span
              className={`font-arcade text-[10px] uppercase shrink-0 ${
                isMyTurn ? 'text-[#6EE7B7]' : 'text-[#94A3B8]'
              }`}
            >
              {isMyTurn
                ? 'DEIN ZUG'
                : playerMap.get(gameState?.currentTurn || '')?.name || 'WARTET'}
            </span>
          )}
        </div>

        {/* Wett-Buttons wenn am Zug */}
        {isMyTurn && (
          <div className="flex flex-col gap-1.5 pt-1">
            {canRaise && (
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCustomRaiseTarget(minRaiseTarget)}
                    className="font-arcade rounded border border-white/20 bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white uppercase hover:bg-white/15 cursor-pointer"
                  >
                    MIN
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomRaiseTarget(showQuickPercentPot(0.5))}
                    className="font-arcade rounded border border-white/20 bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white uppercase hover:bg-white/15 cursor-pointer"
                  >
                    ½
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomRaiseTarget(showQuickPercentPot(1))}
                    className="font-arcade rounded border border-white/20 bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white uppercase hover:bg-white/15 cursor-pointer"
                  >
                    POT
                  </button>
                </div>

                {maxStreetBet > minRaiseTarget && (
                  <input
                    type="range"
                    min={minRaiseTarget}
                    max={maxStreetBet}
                    step={
                      maxStreetBet - minRaiseTarget < Math.max(5, smallBlind)
                        ? 1
                        : Math.max(5, smallBlind)
                    }
                    value={effectiveRaiseTarget}
                    onChange={(e) => setCustomRaiseTarget(Number(e.target.value))}
                    aria-label="Einsatzhöhe wählen"
                    className="flex-1 min-w-[90px] accent-[#F59E0B] cursor-pointer"
                  />
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
