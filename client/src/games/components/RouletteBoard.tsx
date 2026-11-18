import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Clock,
  Repeat,
  RotateCcw,
  Sparkles,
  Trash2,
  Trophy,
  ZoomIn,
} from 'lucide-react';
import type { GameRendererProps } from '../types';
import { Avatar } from '../../components/Avatar';
import { OpenButton } from '../../components/OpenSubpageUI';
import {
  playErrorSound,
  playMoveSound,
  playWinSound,
  triggerHapticFeedback,
} from '../../utils/soundEffects';
import {
  buildPlayerChipMarkers,
  doesBetWin,
  formatBetLabel,
  getRouletteColor,
  HORIZONTAL_INSIDE_SPOTS,
  isNumberCellHighlightedByBet,
  PORTRAIT_INSIDE_SPOTS,
  type InsideSpot,
  type RouletteColor,
} from './rouletteBets';

export type { RouletteColor };

const ROULETTE_WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

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

export interface RouletteState {
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
  winnerId?: string | null;
}

const SPIN_DURATION_MS = 4800;

const CHIP_DENOMINATIONS: Array<{
  value: number | 'all';
  label: string;
  bg: string;
  border: string;
  text: string;
}> = [
  { value: 5, label: '5', bg: '#DC2626', border: '#FCA5A5', text: '#FFFFFF' },
  { value: 25, label: '25', bg: '#059669', border: '#6EE7B7', text: '#FFFFFF' },
  { value: 100, label: '100', bg: '#1E293B', border: '#FBBF24', text: '#FDE68A' },
  { value: 500, label: '500', bg: '#7C3AED', border: '#DDD6FE', text: '#FFFFFF' },
  { value: 'all', label: 'ALL-IN', bg: '#D97706', border: '#FEF08A', text: '#0F172A' },
];

function getChipStyleForAmount(amount: number): {
  bg: string;
  border: string;
  text: string;
} {
  if (amount >= 1000) return CHIP_DENOMINATIONS[4];
  if (amount >= 500) return CHIP_DENOMINATIONS[3];
  if (amount >= 100) return CHIP_DENOMINATIONS[2];
  if (amount >= 25) return CHIP_DENOMINATIONS[1];
  return CHIP_DENOMINATIONS[0];
}

function findBetKeyAtPoint(clientX: number, clientY: number): string | null {
  if (typeof document === 'undefined') return null;
  const el = document.elementFromPoint(clientX, clientY);
  const target = el?.closest<HTMLElement>('[data-bet-key]');
  return target?.dataset.betKey ?? null;
}

const HORIZONTAL_ROWS = [
  Array.from({ length: 12 }, (_, c) => (c + 1) * 3), // 3, 6, ..., 36
  Array.from({ length: 12 }, (_, c) => c * 3 + 2), // 2, 5, ..., 35
  Array.from({ length: 12 }, (_, c) => c * 3 + 1), // 1, 4, ..., 34
];

const PORTRAIT_ROWS = Array.from({ length: 12 }, (_, r) => [r * 3 + 1, r * 3 + 2, r * 3 + 3]);

function formatEuro(amount: number): string {
  return `${Math.round(amount).toLocaleString('de-DE')} €`;
}

function formatCompactChip(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000;
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return String(amount);
}

function formatSignedEuro(amount: number): string {
  const rounded = Math.round(amount);
  const abs = Math.abs(rounded).toLocaleString('de-DE');
  if (rounded > 0) return `+${abs} €`;
  if (rounded < 0) return `-${abs} €`;
  return `0 €`;
}

function sumBets(playerBets: Record<string, number> | undefined): number {
  if (!playerBets) return 0;
  let total = 0;
  for (const val of Object.values(playerBets)) {
    if (typeof val === 'number' && val > 0) total += val;
  }
  return total;
}

function getColorClasses(color: RouletteColor): string {
  if (color === 'green') return 'bg-[#059669] border-[#34D399]/70 text-white';
  if (color === 'red') return 'bg-[#DC2626] border-[#FCA5A5]/50 text-white';
  return 'bg-[#0F172A] border-white/25 text-white';
}

function describeSectorPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number
): string {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const s = toRad(startDeg);
  const e = toRad(endDeg);
  const x1 = cx + rOuter * Math.cos(s);
  const y1 = cy + rOuter * Math.sin(s);
  const x2 = cx + rOuter * Math.cos(e);
  const y2 = cy + rOuter * Math.sin(e);
  const x3 = cx + rInner * Math.cos(e);
  const y3 = cy + rInner * Math.sin(e);
  const x4 = cx + rInner * Math.cos(s);
  const y4 = cy + rInner * Math.sin(s);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${rOuter} ${rOuter} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${rInner} ${rInner} 0 0 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
}

/**
 * Authentischer Europäischer Roulette-Kessel (SVG) mit physikähnlicher Kugel- & Rotor-Animation.
 */
function RouletteWheel({
  phase,
  round,
  winningNumber,
  spinStartedAt,
  sizeClass = 'h-48 w-48 sm:h-60 sm:w-60',
  compactBadge = false,
}: {
  phase: RouletteState['phase'];
  round: number;
  winningNumber: number | null;
  spinStartedAt?: number;
  sizeClass?: string;
  compactBadge?: boolean;
}) {
  const uid = useId();
  const woodRimId = `wheelWoodRim-${uid}`;
  const centerHubId = `wheelCenterHub-${uid}`;
  const ballGradId = `wheelBallGrad-${uid}`;
  const rotorRef = useRef<SVGGElement | null>(null);
  const ballRef = useRef<SVGCircleElement | null>(null);
  const lastRestingDegRef = useRef<number>(0);

  const sectorCount = ROULETTE_WHEEL_NUMBERS.length;
  const sectorAngle = 360 / sectorCount;

  const sectors = useMemo(() => {
    return ROULETTE_WHEEL_NUMBERS.map((num, idx) => {
      const centerDeg = idx * sectorAngle;
      const startDeg = centerDeg - sectorAngle / 2;
      const endDeg = centerDeg + sectorAngle / 2;
      const color = getRouletteColor(num);
      const fill =
        color === 'green' ? '#059669' : color === 'red' ? '#DC2626' : '#111827';
      const pocketFill =
        color === 'green' ? '#047857' : color === 'red' ? '#991B1B' : '#030712';
      return {
        num,
        idx,
        centerDeg,
        fill,
        pocketFill,
        outerPath: describeSectorPath(160, 160, 92, 132, startDeg, endDeg),
        pocketPath: describeSectorPath(160, 160, 62, 92, startDeg, endDeg),
      };
    });
  }, [sectorAngle]);

  useEffect(() => {
    const rotor = rotorRef.current;
    const ball = ballRef.current;
    if (!rotor || !ball) return;

    const applyPosition = (wheelDeg: number, ballWorldDeg: number, ballRadius: number) => {
      rotor.style.transform = `rotate(${wheelDeg.toFixed(2)}deg)`;
      const rad = (ballWorldDeg * Math.PI) / 180;
      const bx = 160 + ballRadius * Math.sin(rad);
      const by = 160 - ballRadius * Math.cos(rad);
      ball.setAttribute('cx', bx.toFixed(2));
      ball.setAttribute('cy', by.toFixed(2));
    };

    if (phase === 'betting' || winningNumber === null) {
      let rafId = 0;
      const startDeg = lastRestingDegRef.current;
      const idleStart = performance.now();
      const idleLoop = (now: number) => {
        const elapsedSec = (now - idleStart) / 1000;
        const deg = startDeg + elapsedSec * 10;
        lastRestingDegRef.current = deg % 360;
        applyPosition(deg, 0, 144);
        rafId = requestAnimationFrame(idleLoop);
      };
      rafId = requestAnimationFrame(idleLoop);
      return () => cancelAnimationFrame(rafId);
    }

    const winIdx = ROULETTE_WHEEL_NUMBERS.indexOf(winningNumber as any);
    const pocketLocalDeg = (winIdx >= 0 ? winIdx : 0) * sectorAngle;
    const startWheelDeg = lastRestingDegRef.current;
    const totalWheelSpin = -(360 * 3 + ((round * 137 + winningNumber * 29) % 360));
    const endWheelDeg = startWheelDeg + totalWheelSpin;
    const finalPocketWorldDeg = endWheelDeg + pocketLocalDeg;

    // Kugel startet entgegengesetzt im Uhrzeigersinn und landet präzise im Gewinnfach
    const rawAlign = ((finalPocketWorldDeg % 360) + 360) % 360;
    const startBallDeg = 0;
    const endBallDeg = rawAlign + 360 * 6;

    if (phase !== 'spinning') {
      lastRestingDegRef.current = endWheelDeg % 360;
      applyPosition(endWheelDeg, endWheelDeg + pocketLocalDeg, 78);
      return;
    }

    let rafId = 0;
    const originTime = spinStartedAt ?? Date.now();

    const animateSpin = () => {
      const elapsed = Math.max(0, Date.now() - originTime);
      const t = Math.min(1, elapsed / SPIN_DURATION_MS);

      // Sanfter Cubic-Ease-Out für Kesselrotor
      const wheelEase = 1 - Math.pow(1 - t, 2.7);
      const wheelDeg = startWheelDeg + totalWheelSpin * wheelEase;
      lastRestingDegRef.current = wheelDeg % 360;

      // Kugel kreist zuerst schnell außen, fällt bei t=0.68..0.90 mit kleinem Hopser ins Fach
      const ballEase = 1 - Math.pow(1 - Math.min(1, t / 0.92), 3.1);
      const orbitDeg = startBallDeg + (endBallDeg - startBallDeg) * ballEase;
      const pocketNowDeg = wheelDeg + pocketLocalDeg;

      let ballDeg: number;
      let ballRadius: number;

      if (t < 0.68) {
        ballDeg = orbitDeg;
        ballRadius = 143;
      } else if (t < 0.92) {
        const dropT = (t - 0.68) / 0.24;
        const smoothDrop = dropT * dropT * (3 - 2 * dropT);
        const bounce = Math.abs(Math.sin(dropT * Math.PI * 2.5)) * (1 - dropT) * 11;
        ballRadius = 143 - smoothDrop * (143 - 78) + bounce;

        // Kürzesten Winkelabstand zum mitdrehenden Zielfach schließen
        const delta = ((((pocketNowDeg - orbitDeg) % 360) + 540) % 360) - 180;
        ballDeg = orbitDeg + delta * smoothDrop;
      } else {
        ballRadius = 78;
        ballDeg = pocketNowDeg;
      }

      applyPosition(wheelDeg, ballDeg, ballRadius);

      if (t < 1) {
        rafId = requestAnimationFrame(animateSpin);
      }
    };

    rafId = requestAnimationFrame(animateSpin);
    return () => cancelAnimationFrame(rafId);
  }, [phase, round, winningNumber, spinStartedAt, sectorAngle]);

  const winColor = winningNumber !== null ? getRouletteColor(winningNumber) : null;

  return (
    <div className={`relative shrink-0 ${sizeClass}`}>
      <svg viewBox="0 0 320 320" className="h-full w-full">
        <defs>
          <radialGradient id={woodRimId} cx="50%" cy="50%" r="50%">
            <stop offset="78%" stopColor="#451A03" />
            <stop offset="92%" stopColor="#78350F" />
            <stop offset="100%" stopColor="#271002" />
          </radialGradient>
          <radialGradient id={centerHubId} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="55%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#78350F" />
          </radialGradient>
          <radialGradient id={ballGradId} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#64748B" />
          </radialGradient>
        </defs>

        {/* Äußerer Mahagoni-Kranz + Goldrand */}
        <circle cx="160" cy="160" r="156" fill={`url(#${woodRimId})`} stroke="#F59E0B" strokeWidth="3" />
        <circle cx="160" cy="160" r="136" fill="none" stroke="#FBBF24" strokeWidth="1.5" strokeOpacity="0.55" />

        {/* 8 Messing-Deflektoren auf dem äußeren Kugelring */}
        {Array.from({ length: 8 }, (_, idx) => {
          const angle = idx * 45;
          return (
            <rect
              key={idx}
              x="157"
              y="11"
              width="6"
              height="9"
              rx="2"
              fill="#FBBF24"
              stroke="#78350F"
              strokeWidth="1"
              transform={`rotate(${angle} 160 160)`}
            />
          );
        })}

        {/* Drehbarer Innenkessel (37 Fächer + Nabe) */}
        <g ref={rotorRef} style={{ transformOrigin: '160px 160px' }}>
          {sectors.map((s) => {
            const isWinSector = phase === 'result' && winningNumber === s.num;
            return (
              <g key={s.num}>
                <path
                  d={s.outerPath}
                  fill={s.fill}
                  stroke={isWinSector ? '#FDE047' : '#D97706'}
                  strokeWidth={isWinSector ? '2.2' : '0.9'}
                />
                <path
                  d={s.pocketPath}
                  fill={s.pocketFill}
                  stroke={isWinSector ? '#FDE047' : '#F59E0B'}
                  strokeWidth={isWinSector ? '2' : '0.8'}
                />
                <text
                  x="160"
                  y="44"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isWinSector ? '#FEF08A' : '#FFFFFF'}
                  fontSize="9.5"
                  fontWeight="800"
                  fontFamily="sans-serif"
                  transform={`rotate(${s.centerDeg} 160 160)`}
                >
                  {s.num}
                </text>
              </g>
            );
          })}

          {/* Goldene Speichen & Kesselmitte */}
          <circle cx="160" cy="160" r="62" fill="#064E3B" stroke="#F59E0B" strokeWidth="2.5" />
          <line x1="112" y1="160" x2="208" y2="160" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
          <line x1="160" y1="112" x2="160" y2="208" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />
          <circle cx="160" cy="160" r="30" fill="#0F172A" stroke="#F59E0B" strokeWidth="2.5" />
          <circle cx="160" cy="160" r="14" fill={`url(#${centerHubId})`} />
        </g>

        {/* Metallische Roulette-Kugel */}
        <circle
          ref={ballRef}
          cx="160"
          cy="16"
          r={phase === 'betting' ? 5 : 6.2}
          fill={`url(#${ballGradId})`}
          stroke="#0F172A"
          strokeWidth="0.9"
          opacity={phase === 'betting' ? 0.55 : 1}
        />
      </svg>

      {/* Mittel-Badge bei Ergebnis / Spin */}
      {phase === 'result' && winningNumber !== null && winColor && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className={`flex flex-col items-center justify-center rounded-full ${
              compactBadge ? 'h-6 w-6 border' : 'h-14 w-14 border-2'
            } ${getColorClasses(winColor)}`}
          >
            <span
              className={`font-arcade leading-none ${
                compactBadge ? 'text-[10px]' : 'text-xl'
              }`}
            >
              {winningNumber}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface BettingTableProps {
  allBets: Record<string, Record<string, number>>;
  players: GameRendererProps<RouletteState>['allPlayers'];
  myPlayerId: string;
  isTvScreen: boolean;
  canBet: boolean;
  winningNumber: number | null;
  phase: RouletteState['phase'];
  hoveredBetKey?: string | null;
  layout?: 'horizontal' | 'portrait';
  onHoverBetChange?: (betKey: string | null) => void;
  onPlaceBet: (betKey: string) => void;
}

function BettingTable({
  allBets,
  players,
  myPlayerId,
  isTvScreen,
  canBet,
  winningNumber,
  phase,
  hoveredBetKey,
  layout = 'horizontal',
  onHoverBetChange,
  onPlaceBet,
}: BettingTableProps) {
  const isPortraitLayout = layout === 'portrait';
  const [mouseHoverBetKey, setMouseHoverBetKey] = useState<string | null>(null);

  const playerMarkers = useMemo(
    () => buildPlayerChipMarkers(players, myPlayerId),
    [players, myPlayerId]
  );

  const showPlayerDistinction = isTvScreen || players.length > 1;
  const showWinHighlight = phase === 'result' && winningNumber !== null;
  const activePreviewBetKey = canBet ? hoveredBetKey ?? mouseHoverBetKey : null;

  const setDesktopHover = (betKey: string | null) => {
    setMouseHoverBetKey(betKey);
    onHoverBetChange?.(betKey);
  };

  const renderChipStack = (betKey: string, mode: 'cell' | 'spot') => {
    const entries = players
      .map((p) => {
        const amount = allBets[p.id]?.[betKey] || 0;
        const marker = playerMarkers.get(p.id);
        return marker && amount > 0 ? { player: p, amount, marker } : null;
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    if (entries.length === 0) return null;

    // Eigener Chip immer zuerst/prominent vorne
    entries.sort((a, b) => Number(b.marker.isMe) - Number(a.marker.isMe));

    const isCompactChip = mode === 'spot' || isPortraitLayout;
    const stackPositionClass =
      mode === 'spot'
        ? 'relative flex items-center -space-x-1.5'
        : isPortraitLayout
          ? 'pointer-events-none absolute -top-1 -right-1 z-20 flex items-center -space-x-1'
          : 'pointer-events-none absolute -top-1.5 -right-1.5 z-20 flex items-center -space-x-1';

    return (
      <span className={stackPositionClass}>
        {entries.slice(0, 4).map(({ player, amount, marker }) => {
          const isMyChip = marker.isMe && !isTvScreen;
          const denomStyle = getChipStyleForAmount(amount);
          const chipStyle: React.CSSProperties = isMyChip
            ? {
                backgroundColor: denomStyle.bg,
                borderColor: denomStyle.border,
                color: denomStyle.text,
                boxShadow: showPlayerDistinction
                  ? `0 0 0 2px ${marker.theme.color}`
                  : undefined,
              }
            : {
                backgroundColor: marker.theme.color,
                borderColor: marker.theme.border,
                color: marker.theme.text,
              };

          return (
            <span
              key={player.id}
              title={`${player.name}: ${formatEuro(amount)}`}
              style={chipStyle}
              className={`relative inline-flex items-center justify-center rounded-full border-2 border-dashed px-0.5 font-arcade leading-none ring-1 ring-[#0F172A]/85 ${
                isCompactChip
                  ? 'h-[17px] min-w-[17px] text-[7px]'
                  : 'h-[19px] min-w-[19px] sm:h-5 sm:min-w-5 text-[8px] sm:text-[9px]'
              }`}
            >
              <span>{formatCompactChip(amount)}</span>
              {showPlayerDistinction && !isMyChip && (
                <span
                  style={{
                    borderColor: marker.theme.color,
                    color: marker.theme.color,
                  }}
                  className="pointer-events-none absolute -bottom-1.5 -left-1 inline-flex h-2.5 min-w-2.5 items-center justify-center rounded-full border bg-[#0F172A] px-0.5 font-arcade text-[6px] leading-none"
                >
                  {marker.shortTag}
                </span>
              )}
              {showPlayerDistinction && isMyChip && entries.length > 1 && (
                <span
                  style={{ backgroundColor: marker.theme.color }}
                  className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-[#0F172A]"
                />
              )}
            </span>
          );
        })}
      </span>
    );
  };

  const renderNumberCell = (
    num: number,
    extraClass = '',
    gridStyle?: React.CSSProperties
  ) => {
    const betKey = `number:${num}`;
    const color = getRouletteColor(num);
    const isWinner = showWinHighlight && winningNumber === num;
    const isPreviewHighlighted =
      canBet && isNumberCellHighlightedByBet(activePreviewBetKey, num);
    const isDirectPreview = canBet && activePreviewBetKey === betKey;

    return (
      <button
        key={betKey}
        type="button"
        data-bet-key={canBet ? betKey : undefined}
        disabled={!canBet}
        onClick={() => onPlaceBet(betKey)}
        onPointerEnter={(e) => {
          if (canBet && e.pointerType === 'mouse') setDesktopHover(betKey);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse' && mouseHoverBetKey === betKey) setDesktopHover(null);
        }}
        style={gridStyle}
        className={`relative flex items-center justify-center rounded-md border font-arcade text-xs sm:text-sm transition-transform select-none ${
          canBet ? 'cursor-pointer hover:brightness-125 active:scale-95' : 'cursor-default'
        } ${
          color === 'green'
            ? 'border-[#34D399]/60 bg-[#059669] text-white'
            : color === 'red'
              ? 'border-[#F87171]/45 bg-[#B91C1C] text-white'
              : 'border-white/25 bg-[#0F172A] text-white'
        } ${
          isPreviewHighlighted
            ? `ring-2 ring-[#FDE047] brightness-125 ${isDirectPreview ? 'scale-[1.04]' : ''} z-10`
            : isWinner
              ? 'ring-2 ring-[#FDE047] z-10'
              : ''
        } ${extraClass}`}
      >
        <span>{num}</span>
        {renderChipStack(betKey, 'cell')}
      </button>
    );
  };

  const renderOutsideCell = (
    betKey: string,
    label: ReactNode,
    toneClass: string,
    extraClass = '',
    gridStyle?: React.CSSProperties,
    ariaLabel?: string
  ) => {
    const isWinner = showWinHighlight && winningNumber !== null && doesBetWin(betKey, winningNumber);
    const isDragHovered = canBet && activePreviewBetKey === betKey;

    return (
      <button
        key={betKey}
        type="button"
        aria-label={ariaLabel}
        data-bet-key={canBet ? betKey : undefined}
        disabled={!canBet}
        onClick={() => onPlaceBet(betKey)}
        onPointerEnter={(e) => {
          if (canBet && e.pointerType === 'mouse') setDesktopHover(betKey);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse' && mouseHoverBetKey === betKey) setDesktopHover(null);
        }}
        style={gridStyle}
        className={`relative flex items-center justify-center rounded-md border px-1.5 py-1.5 font-arcade text-[10px] sm:text-xs tracking-wide uppercase transition-transform select-none ${
          canBet ? 'cursor-pointer hover:brightness-125 active:scale-95' : 'cursor-default'
        } ${toneClass} ${
          isDragHovered
            ? 'ring-2 ring-[#FDE047] brightness-125 scale-[1.03] z-20'
            : isWinner
              ? 'ring-2 ring-[#FDE047] z-10'
              : ''
        } ${extraClass}`}
      >
        {typeof label === 'string' ? <span className="truncate">{label}</span> : label}
        {renderChipStack(betKey, 'cell')}
      </button>
    );
  };

  const renderInsideOverlay = (spots: InsideSpot[]) => (
    <>
      {/* Unsichtbare präzise Klick- & Drag-Hotspots auf Kanten/Ecken zwischen Zahlen */}
      {canBet && (
        <div className="pointer-events-none absolute inset-0 z-20">
          {spots.map((spot) => {
            const isHovered = activePreviewBetKey === spot.betKey;
            return (
              <button
                key={spot.betKey}
                type="button"
                aria-label={spot.title}
                title={spot.title}
                data-bet-key={spot.betKey}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlaceBet(spot.betKey);
                }}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') setDesktopHover(spot.betKey);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === 'mouse' && mouseHoverBetKey === spot.betKey) {
                    setDesktopHover(null);
                  }
                }}
                style={{
                  left: `${spot.leftPct}%`,
                  top: `${spot.topPct}%`,
                  width: spot.widthStyle,
                  height: spot.heightStyle,
                  zIndex: spot.zIndex,
                  transform: 'translate(-50%, -50%)',
                }}
                className="roulette-inside-hotspot pointer-events-auto absolute flex items-center justify-center rounded-full bg-transparent cursor-pointer focus:outline-none"
              >
                {isHovered && (
                  <span className="pointer-events-none h-2.5 w-2.5 rounded-full bg-[#FDE047] ring-2 ring-[#0F172A]" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Abgelegte Multi-Feld-Chips exakt auf der Linie / Ecke */}
      <div className="pointer-events-none absolute inset-0 z-40">
        {spots.map((spot) => {
          const hasAnyBet = players.some((p) => (allBets[p.id]?.[spot.betKey] || 0) > 0);
          if (!hasAnyBet) return null;
          const isWinningSpot =
            showWinHighlight && winningNumber !== null && doesBetWin(spot.betKey, winningNumber);

          return (
            <div
              key={`chip-${spot.betKey}`}
              style={{
                left: `${spot.leftPct}%`,
                top: `${spot.topPct}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`pointer-events-none absolute flex items-center justify-center rounded-full ${
                isWinningSpot ? 'ring-2 ring-[#FDE047]' : ''
              }`}
            >
              {renderChipStack(spot.betKey, 'spot')}
            </div>
          );
        })}
      </div>
    </>
  );

  if (isPortraitLayout) {
    const verticalLabel = (text: string) => (
      <span className="[writing-mode:vertical-rl] leading-none whitespace-nowrap text-[8px] min-[390px]:text-[9px] sm:text-[10px] tracking-tight">
        {text}
      </span>
    );

    return (
      <div className="roulette-portrait-felt flex h-full w-full flex-col select-none rounded-2xl border border-[#34D399]/35 bg-gradient-to-br from-[#064E3B]/95 via-[#065F46]/90 to-[#022C22]/95 p-1.5 sm:p-2">
        <div
          className="roulette-felt-portrait grid h-full w-full flex-1 min-h-0 grid-cols-[26px_repeat(3,minmax(0,1fr))_26px] min-[390px]:grid-cols-[30px_repeat(3,minmax(0,1fr))_30px] sm:grid-cols-[36px_repeat(3,minmax(0,1fr))_36px] gap-[3px]"
          style={{
            gridTemplateRows:
              'minmax(24px, 0.95fr) repeat(12, minmax(22px, 1fr)) minmax(24px, 0.9fr)',
          }}
        >
          {/* 0 oben mittig über den 3 Zahlen-Spalten */}
          {renderNumberCell(0, 'h-full w-full text-sm sm:text-base', {
            gridColumn: '2 / 5',
            gridRow: '1 / 2',
          })}

          {/* Linke Außenwetten (je 2 Zahlenreihen hoch, vertikal ausgerichtet) */}
          {renderOutsideCell(
            'range:low',
            verticalLabel('1-18'),
            'border-white/25 bg-[#047857]/60 text-white',
            'h-full w-full px-0! py-0.5!',
            { gridColumn: '1 / 2', gridRow: '2 / 4' },
            '1 bis 18'
          )}
          {renderOutsideCell(
            'parity:even',
            verticalLabel('GERADE'),
            'border-white/25 bg-[#047857]/60 text-white',
            'h-full w-full px-0! py-0.5!',
            { gridColumn: '1 / 2', gridRow: '4 / 6' },
            'Gerade'
          )}
          {renderOutsideCell(
            'color:red',
            <span className="h-3.5 w-3.5 rotate-45 rounded-[2px] border border-white/85 bg-[#DC2626]" />,
            'border-white/25 bg-[#047857]/60 text-white',
            'h-full w-full px-0! py-0.5!',
            { gridColumn: '1 / 2', gridRow: '6 / 8' },
            'Rot'
          )}
          {renderOutsideCell(
            'color:black',
            <span className="h-3.5 w-3.5 rotate-45 rounded-[2px] border border-white/85 bg-[#0F172A]" />,
            'border-white/25 bg-[#047857]/60 text-white',
            'h-full w-full px-0! py-0.5!',
            { gridColumn: '1 / 2', gridRow: '8 / 10' },
            'Schwarz'
          )}
          {renderOutsideCell(
            'parity:odd',
            verticalLabel('UNGERADE'),
            'border-white/25 bg-[#047857]/60 text-white',
            'h-full w-full px-0! py-0.5!',
            { gridColumn: '1 / 2', gridRow: '10 / 12' },
            'Ungerade'
          )}
          {renderOutsideCell(
            'range:high',
            verticalLabel('19-36'),
            'border-white/25 bg-[#047857]/60 text-white',
            'h-full w-full px-0! py-0.5!',
            { gridColumn: '1 / 2', gridRow: '12 / 14' },
            '19 bis 36'
          )}

          {/* Rechte Dutzend-Wetten (je 4 Zahlenreihen hoch, vertikal ausgerichtet) */}
          {renderOutsideCell(
            'dozen:1',
            verticalLabel('1. 12'),
            'border-white/25 bg-[#047857]/60 text-white',
            'h-full w-full px-0! py-0.5!',
            { gridColumn: '5 / 6', gridRow: '2 / 6' },
            '1. Dutzend (1 bis 12)'
          )}
          {renderOutsideCell(
            'dozen:2',
            verticalLabel('2. 12'),
            'border-white/25 bg-[#047857]/60 text-white',
            'h-full w-full px-0! py-0.5!',
            { gridColumn: '5 / 6', gridRow: '6 / 10' },
            '2. Dutzend (13 bis 24)'
          )}
          {renderOutsideCell(
            'dozen:3',
            verticalLabel('3. 12'),
            'border-white/25 bg-[#047857]/60 text-white',
            'h-full w-full px-0! py-0.5!',
            { gridColumn: '5 / 6', gridRow: '10 / 14' },
            '3. Dutzend (25 bis 36)'
          )}

          {/* Untere 2:1 Spaltenwetten */}
          {renderOutsideCell(
            'column:1',
            '2:1',
            'border-white/25 bg-[#047857]/65 text-[#FDE68A]',
            'h-full w-full px-0! py-0.5! text-[10px] sm:text-xs',
            { gridColumn: '2 / 3', gridRow: '14 / 15' },
            'Erste Kolonne 2 zu 1'
          )}
          {renderOutsideCell(
            'column:2',
            '2:1',
            'border-white/25 bg-[#047857]/65 text-[#FDE68A]',
            'h-full w-full px-0! py-0.5! text-[10px] sm:text-xs',
            { gridColumn: '3 / 4', gridRow: '14 / 15' },
            'Zweite Kolonne 2 zu 1'
          )}
          {renderOutsideCell(
            'column:3',
            '2:1',
            'border-white/25 bg-[#047857]/65 text-[#FDE68A]',
            'h-full w-full px-0! py-0.5! text-[10px] sm:text-xs',
            { gridColumn: '4 / 5', gridRow: '14 / 15' },
            'Dritte Kolonne 2 zu 1'
          )}

          {/* Zahlenraster 1–36 (12 Reihen × 3 Spalten) + Kanten/Ecken-Overlay für Multi-Feld-Wetten */}
          <div
            style={{ gridColumn: '2 / 5', gridRow: '2 / 14' }}
            className="roulette-felt-portrait-numbers relative grid h-full w-full grid-cols-3 grid-rows-12 gap-[3px]"
          >
            {PORTRAIT_ROWS.flatMap((row) =>
              row.map((num) =>
                renderNumberCell(num, 'h-full w-full text-xs min-[390px]:text-sm sm:text-base')
              )
            )}
            {renderInsideOverlay(PORTRAIT_INSIDE_SPOTS)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="roulette-landscape-felt w-full select-none rounded-2xl border border-[#34D399]/35 bg-gradient-to-br from-[#064E3B]/95 via-[#065F46]/90 to-[#022C22]/95 p-1.5 sm:p-2.5">
      {/* WIDE / LANDSCAPE / TV HORIZONTAL CASINO FELT */}
      <div className="roulette-felt-horizontal flex flex-col gap-1">
        <div className="grid grid-cols-[32px_repeat(12,minmax(0,1fr))_34px] md:grid-cols-[40px_repeat(12,minmax(0,1fr))_42px] gap-1">
          {renderNumberCell(0, 'roulette-zero-cell row-span-3 min-h-[104px]', {
            gridColumn: '1 / 2',
            gridRow: '1 / 4',
          })}

          {renderOutsideCell(
            'column:3',
            '2:1',
            'border-white/25 bg-[#047857]/60 text-[#FDE68A]',
            'h-8.5',
            { gridColumn: '14 / 15', gridRow: '1 / 2' }
          )}
          {renderOutsideCell(
            'column:2',
            '2:1',
            'border-white/25 bg-[#047857]/60 text-[#FDE68A]',
            'h-8.5',
            { gridColumn: '14 / 15', gridRow: '2 / 3' }
          )}
          {renderOutsideCell(
            'column:1',
            '2:1',
            'border-white/25 bg-[#047857]/60 text-[#FDE68A]',
            'h-8.5',
            { gridColumn: '14 / 15', gridRow: '3 / 4' }
          )}

          {/* 12×3 Zahlenraster + Kanten/Ecken-Overlay für Multi-Feld-Wetten (z-10 über Nachbar-Naht) */}
          <div
            style={{ gridColumn: '2 / 14', gridRow: '1 / 4' }}
            className="relative z-10 grid grid-cols-12 grid-rows-3 gap-1"
          >
            {HORIZONTAL_ROWS.flatMap((row) => row.map((n) => renderNumberCell(n, 'h-8.5')))}
            {renderInsideOverlay(HORIZONTAL_INSIDE_SPOTS)}
          </div>
        </div>

        {/* Dutzende */}
        <div className="grid grid-cols-[32px_repeat(3,minmax(0,1fr))_34px] md:grid-cols-[40px_repeat(3,minmax(0,1fr))_42px] gap-1">
          <div aria-hidden="true" />
          {renderOutsideCell('dozen:1', '1. 12 (1–12)', 'border-white/25 bg-[#047857]/55 text-white', 'h-7.5')}
          {renderOutsideCell('dozen:2', '2. 12 (13–24)', 'border-white/25 bg-[#047857]/55 text-white', 'h-7.5')}
          {renderOutsideCell('dozen:3', '3. 12 (25–36)', 'border-white/25 bg-[#047857]/55 text-white', 'h-7.5')}
          <div aria-hidden="true" />
        </div>

        {/* Einfache Chancen */}
        <div className="grid grid-cols-[32px_repeat(6,minmax(0,1fr))_34px] md:grid-cols-[40px_repeat(6,minmax(0,1fr))_42px] gap-1">
          <div aria-hidden="true" />
          {renderOutsideCell('range:low', '1–18', 'border-white/25 bg-[#047857]/55 text-white', 'h-7.5')}
          {renderOutsideCell('parity:even', 'GERADE', 'border-white/25 bg-[#047857]/55 text-white', 'h-7.5')}
          {renderOutsideCell('color:red', 'ROT ◆', 'border-[#FCA5A5]/50 bg-[#B91C1C] text-white', 'h-7.5')}
          {renderOutsideCell('color:black', 'SCHWARZ ◆', 'border-white/30 bg-[#0F172A] text-white', 'h-7.5')}
          {renderOutsideCell('parity:odd', 'UNGERADE', 'border-white/25 bg-[#047857]/55 text-white', 'h-7.5')}
          {renderOutsideCell('range:high', '19–36', 'border-white/25 bg-[#047857]/55 text-white', 'h-7.5')}
          <div aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

export function RouletteBoard({
  gameState,
  myPlayer,
  allPlayers,
  onMove,
  disabled,
}: GameRendererProps<RouletteState>) {
  const isTvScreen = Boolean(myPlayer?.isTvScreen);
  const myId = myPlayer?.id || '';
  const phase = gameState?.phase ?? 'betting';
  const round = gameState?.round ?? 1;
  const maxRounds = gameState?.maxRounds ?? 5;
  const startingBalance = gameState?.startingBalance ?? 1000;
  const phaseEndsAt = gameState?.phaseEndsAt;
  const winningNumber = gameState?.winningNumber ?? null;
  const history = gameState?.history ?? [];

  const [selectedChip, setSelectedChip] = useState<number | 'all'>(25);
  const [dragChip, setDragChip] = useState<{
    value: number | 'all';
    amount: number;
    label: string;
    bg: string;
    border: string;
    text: string;
  } | null>(null);
  const [pendingDrops, setPendingDrops] = useState<
    Array<{ id: number; round: number; targetOrderLen: number; betKey: string; amount: number }>
  >([]);
  const [hoveredBetKey, setHoveredBetKey] = useState<string | null>(null);
  const [tableHoverBetKey, setTableHoverBetKey] = useState<string | null>(null);
  const [isCompactScreen, setIsCompactScreen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1023px), (max-height: 540px)').matches;
  });
  const [isWheelZoomed, setIsWheelZoomed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() =>
    phaseEndsAt ? Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000)) : 0
  );

  const sentPhaseTriggerRef = useRef<{ phaseKey: string; sentAt: number } | null>(null);
  const lastSoundOutcomeRoundRef = useRef<number | null>(null);
  const ghostChipRef = useRef<HTMLDivElement | null>(null);
  const dragPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const dropSeqRef = useRef(0);

  // Timer + autoritative Phasenübergänge auslösen (nur aktive Smartphone-Clients, TV bleibt reiner Zuschauer)
  useEffect(() => {
    if (!phaseEndsAt) return;

    const phaseKey = `${round}:${phase}:${phaseEndsAt}`;

    const syncTimer = () => {
      const now = Date.now();
      const remainingMs = phaseEndsAt - now;
      setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));

      const prevTrigger = sentPhaseTriggerRef.current;
      const canSendTrigger =
        !prevTrigger || prevTrigger.phaseKey !== phaseKey || now - prevTrigger.sentAt >= 1500;

      if (!isTvScreen && !disabled && remainingMs <= 0 && canSendTrigger) {
        if (phase === 'betting') {
          sentPhaseTriggerRef.current = { phaseKey, sentAt: now };
          onMove({ type: 'time_up' });
        } else if (phase === 'spinning' && remainingMs <= -120) {
          sentPhaseTriggerRef.current = { phaseKey, sentAt: now };
          onMove({ type: 'finish_spin' });
        } else if (phase === 'result') {
          sentPhaseTriggerRef.current = { phaseKey, sentAt: now };
          onMove({ type: 'time_up' });
        }
      }
    };

    const initTimer = setTimeout(syncTimer, 0);
    const timer = setInterval(syncTimer, 250);
    return () => {
      clearTimeout(initTimer);
      clearInterval(timer);
    };
  }, [phase, round, phaseEndsAt, isTvScreen, disabled, onMove]);

  // Drag-Cleanup bei Unmount
  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
    };
  }, []);

  // Kleine Bildschirme erkennen (Drehrad-Zoom nur dort aktiv) & per Escape schließen
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1023px), (max-height: 540px)');
    const syncViewport = () => {
      setIsCompactScreen(mq.matches);
      if (!mq.matches) {
        setIsWheelZoomed(false);
      }
    };
    syncViewport();
    mq.addEventListener('change', syncViewport);
    return () => mq.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    if (!isWheelZoomed) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setIsWheelZoomed(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isWheelZoomed]);

  // Gewinn- / Verlust-Sound einmalig beim Ergebnis
  useEffect(() => {
    if (isTvScreen || phase !== 'result' || !gameState?.lastOutcome) return;
    const outcomeRound = gameState.lastOutcome.round;
    if (lastSoundOutcomeRoundRef.current === outcomeRound) return;
    lastSoundOutcomeRoundRef.current = outcomeRound;

    const myWager = gameState.lastOutcome.totalWagered?.[myId] ?? 0;
    const myNet = gameState.lastOutcome.netProfit?.[myId] ?? 0;
    if (myWager > 0) {
      if (myNet > 0) {
        playWinSound();
        triggerHapticFeedback([18, 35, 25]);
      } else if (myNet < 0) {
        playErrorSound();
      }
    }
  }, [phase, isTvScreen, gameState?.lastOutcome, myId]);

  const myBalance = gameState?.balances?.[myId] ?? startingBalance;
  const settledBets = gameState?.lastOutcome?.settledBets;
  const liveBets = gameState?.bets;
  const activeTableBets = useMemo(
    () => (phase === 'result' && settledBets ? settledBets : liveBets || {}),
    [phase, settledBets, liveBets]
  );

  const confirmedOrderLen = (gameState?.betOrder?.[myId] || []).length;
  const activePending = useMemo(
    () =>
      phase === 'betting'
        ? pendingDrops.filter((d) => d.round === round && d.targetOrderLen > confirmedOrderLen)
        : [],
    [pendingDrops, phase, round, confirmedOrderLen]
  );
  const pendingWager = useMemo(
    () => activePending.reduce((sum, d) => sum + d.amount, 0),
    [activePending]
  );
  const effectiveBalance = Math.max(0, myBalance - pendingWager);
  const displayedTableBets = useMemo(() => {
    if (activePending.length === 0) return activeTableBets;
    const mergedMyBets = { ...(activeTableBets[myId] || {}) };
    for (const d of activePending) {
      mergedMyBets[d.betKey] = (mergedMyBets[d.betKey] || 0) + d.amount;
    }
    return { ...activeTableBets, [myId]: mergedMyBets };
  }, [activeTableBets, activePending, myId]);

  const isMultiplayer = allPlayers.length > 1;
  const myWagered = sumBets(gameState?.bets?.[myId]);
  const displayedWagered = myWagered + pendingWager;
  const myLastRoundBets = gameState?.lastRoundBets?.[myId] || {};
  const canRebet = sumBets(myLastRoundBets) > 0 && sumBets(myLastRoundBets) <= myBalance + myWagered;
  const canDouble = myWagered > 0 && myWagered <= effectiveBalance;
  const isLocked = !isMultiplayer && (gameState?.lockedPlayerIds || []).includes(myId);
  const isNextReady = (gameState?.nextReadyIds || []).includes(myId);
  const canBet = !isTvScreen && !disabled && phase === 'betting' && !isLocked && effectiveBalance > 0;

  const handlePlaceBet = (betKey: string, chipOverride?: number | 'all') => {
    if (!canBet) return;
    const chipChoice = chipOverride ?? selectedChip;
    const amount = chipChoice === 'all' ? effectiveBalance : Math.min(chipChoice, effectiveBalance);
    if (amount <= 0) return;

    const dropId = ++dropSeqRef.current;
    const targetOrderLen = confirmedOrderLen + activePending.length + 1;
    setPendingDrops((prev) => [
      ...prev.filter((d) => d.round === round && d.targetOrderLen > confirmedOrderLen),
      { id: dropId, round, targetOrderLen, betKey, amount },
    ]);
    setTimeout(() => {
      setPendingDrops((prev) => prev.filter((d) => d.id !== dropId));
    }, 1500);

    playMoveSound();
    triggerHapticFeedback(8);
    onMove({ type: 'place_bet', betKey, amount });
  };

  const latestCanBetRef = useRef(canBet);
  const latestPlaceBetRef = useRef(handlePlaceBet);
  useEffect(() => {
    latestCanBetRef.current = canBet;
    latestPlaceBetRef.current = handlePlaceBet;
  });

  const handleChipPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    chip: (typeof CHIP_DENOMINATIONS)[number]
  ) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const chipAmount = chip.value === 'all' ? effectiveBalance : chip.value;
    if (!canBet || effectiveBalance <= 0 || chipAmount > effectiveBalance) return;
    if (e.pointerType === 'mouse') {
      e.preventDefault();
    }

    dragCleanupRef.current?.();
    setIsWheelZoomed(false);

    const pointerId = e.pointerId;
    const touchOffsetY = e.pointerType === 'touch' ? -26 : 0;
    const startX = e.clientX;
    const startY = e.clientY;
    const getTipPoint = (clientX: number, clientY: number) => ({
      x: clientX,
      y: Math.max(18, clientY + touchOffsetY),
    });

    dragPosRef.current = getTipPoint(startX, startY);
    let hasMoved = false;

    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('touchmove', preventTouchScroll);
      window.removeEventListener('blur', onWindowBlur);
      dragCleanupRef.current = null;
    };

    const preventTouchScroll = (ev: TouchEvent) => {
      if (ev.cancelable) ev.preventDefault();
    };

    const finishDrag = () => {
      cleanup();
      setDragChip(null);
      setHoveredBetKey(null);
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      if (!latestCanBetRef.current) {
        finishDrag();
        return;
      }

      const tip = getTipPoint(ev.clientX, ev.clientY);
      dragPosRef.current = tip;

      if (ghostChipRef.current) {
        ghostChipRef.current.style.transform = `translate3d(${tip.x}px, ${tip.y}px, 0) translate(-50%, -50%)`;
      }

      if (!hasMoved) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 2) return;
        hasMoved = true;
        setSelectedChip(chip.value);
        setDragChip({
          value: chip.value,
          amount: chipAmount,
          label: chip.value === 'all' ? 'MAX' : `${chip.label}€`,
          bg: chip.bg,
          border: chip.border,
          text: chip.text,
        });
      }

      const nextHover = findBetKeyAtPoint(tip.x, tip.y);
      setHoveredBetKey((prev) => (prev === nextHover ? prev : nextHover));
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const tip = getTipPoint(ev.clientX, ev.clientY);
      const dropKey = hasMoved && latestCanBetRef.current ? findBetKeyAtPoint(tip.x, tip.y) : null;
      const wasMoved = hasMoved;
      finishDrag();

      if (!wasMoved) {
        setSelectedChip(chip.value);
        return;
      }

      if (dropKey) {
        latestPlaceBetRef.current(dropKey, chip.value);
      }
    };

    const onPointerCancel = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      finishDrag();
    };

    const onWindowBlur = () => {
      finishDrag();
    };

    dragCleanupRef.current = cleanup;
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('touchmove', preventTouchScroll, { passive: false });
    window.addEventListener('blur', onWindowBlur);
  };

  const playerMarkers = useMemo(
    () => buildPlayerChipMarkers(allPlayers, myId),
    [allPlayers, myId]
  );

  const rankedPlayers = useMemo(() => {
    return [...allPlayers].sort(
      (a, b) => (gameState?.scores?.[b.id] ?? 0) - (gameState?.scores?.[a.id] ?? 0)
    );
  }, [allPlayers, gameState?.scores]);

  // ─── TV-ANSICHT: GROSSE CASINO-BÜHNE FÜR DAS WOHNZIMMER ───
  if (isTvScreen) {
    return (
      <div className="flex w-full flex-1 min-h-0 flex-col gap-3 justify-between">
        {/* Obere History-Leiste der letzten Zahlen */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-0.5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="font-arcade text-[10px] tracking-wider text-[#94A3B8] uppercase shrink-0">
              VERLAUF
            </span>
            {history.length === 0 ? (
              <span className="font-arcade text-[11px] text-white/45 uppercase">
                NOCH KEINE ZIEHUNG
              </span>
            ) : (
              history.slice(0, 12).map((item, idx) => (
                <span
                  key={`${item.round}-${idx}`}
                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 font-arcade text-xs ${getColorClasses(
                    item.color
                  )} ${idx === 0 ? 'ring-2 ring-[#FDE047]' : 'opacity-85'}`}
                >
                  {item.number}
                </span>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-arcade text-xs text-[#FDE68A] uppercase">
              {phase === 'betting'
                ? 'EINSÄTZE PLATZIEREN'
                : phase === 'spinning'
                  ? 'NICHTS GEHT MEHR!'
                  : winningNumber !== null
                    ? `GEWINNZAHL: ${winningNumber}`
                    : 'ERGEBNIS'}
            </span>
            {phase === 'betting' && (
              <span
                className={`font-arcade inline-flex items-center gap-1 text-xs ${
                  timeLeft <= 5 ? 'text-[#FDA4AF] animate-pulse' : 'text-[#FDE68A]'
                }`}
              >
                <Clock className="h-3 w-3" />
                {timeLeft}S
              </span>
            )}
          </div>
        </div>

        {/* Hauptbereich: Kessel links, Live-Tisch & Spieler-Guthaben rechts */}
        <div className="grid grid-cols-1 lg:grid-cols-[auto_minmax(0,1fr)] items-center gap-4 lg:gap-7 flex-1 min-h-0">
          {/* Links: Roulette-Kessel */}
          <div className="flex flex-col items-center justify-center gap-3 p-1 lg:min-w-[260px]">
            <RouletteWheel
              phase={phase}
              round={round}
              winningNumber={winningNumber}
              spinStartedAt={gameState?.spinStartedAt}
              sizeClass="w-[min(220px,36vh)] lg:w-[min(320px,48vh)] xl:w-[min(390px,54vh)] aspect-square"
            />
            {phase === 'result' && winningNumber !== null && (
              <div className="flex items-center gap-2 px-2 py-0.5">
                <Sparkles className="h-4 w-4 text-[#FDE047]" />
                <span className="font-arcade text-sm text-[#FEF08A] uppercase">
                  {winningNumber === 0
                    ? '0 GRÜN!'
                    : `${winningNumber} ${getRouletteColor(winningNumber) === 'red' ? 'ROT' : 'SCHWARZ'}`}
                </span>
              </div>
            )}
          </div>

          {/* Rechts: Live-Tisch mit allen Spieler-Chips + Kassenstand */}
          <div className="flex flex-col gap-3 min-w-0">
            <BettingTable
              allBets={activeTableBets}
              players={allPlayers}
              myPlayerId={myId}
              isTvScreen={true}
              canBet={false}
              winningNumber={winningNumber}
              phase={phase}
              onPlaceBet={() => {}}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {rankedPlayers.map((p, idx) => {
                const marker = playerMarkers.get(p.id);
                const chipBg = marker?.theme.color || '#F59E0B';
                const chipBorder = marker?.theme.border || '#FEF08A';
                const chipText = marker?.theme.text || '#0F172A';
                const shortTag = marker?.shortTag || `S${idx + 1}`;
                const totalScore = gameState?.scores?.[p.id] ?? startingBalance;
                const activeWager = sumBets(gameState?.bets?.[p.id]);
                const roundNet = gameState?.lastOutcome?.netProfit?.[p.id];
                const playerLocked = (gameState?.lockedPlayerIds || []).includes(p.id);

                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between gap-2 px-1 py-1 ${
                      idx === 0 ? 'border-b-2 border-[#F59E0B]/70' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        title={`${p.name} (${shortTag})`}
                        style={{
                          backgroundColor: chipBg,
                          borderColor: chipBorder,
                          color: chipText,
                        }}
                        className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border-2 border-dashed px-1 font-arcade text-[7px] leading-none ring-1 ring-[#0F172A]"
                      >
                        {shortTag}
                      </span>
                      <Avatar config={p.avatar} size={28} />
                      <div className="min-w-0">
                        <div className="font-arcade text-[11px] text-white uppercase truncate">
                          {p.name}
                        </div>
                        <div className="font-arcade text-[10px] text-[#94A3B8] uppercase">
                          {phase === 'result' && typeof roundNet === 'number' ? (
                            <span
                              className={
                                roundNet > 0
                                  ? 'text-[#34D399]'
                                  : roundNet < 0
                                    ? 'text-[#FCA5A5]'
                                    : ''
                              }
                            >
                              {formatSignedEuro(roundNet)}
                            </span>
                          ) : activeWager > 0 ? (
                            `SETZT ${formatEuro(activeWager)}`
                          ) : !isMultiplayer && playerLocked ? (
                            'BEREIT ✓'
                          ) : (
                            'SETZT...'
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="font-arcade text-xs sm:text-sm text-[#FDE68A] shrink-0">
                      {formatEuro(totalScore)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── SPIELER-ANSICHT (STANDARD & TV-CONTROLLER) ───
  const myOutcomeNet = gameState?.lastOutcome?.netProfit?.[myId] ?? 0;
  const myOutcomePayout = gameState?.lastOutcome?.totalPayout?.[myId] ?? 0;
  const myOutcomeWager = gameState?.lastOutcome?.totalWagered?.[myId] ?? 0;
  const nextReadyCount = (gameState?.nextReadyIds || []).length;

  const renderWheelControl = (sizeClass: string, compactBadge = false) => {
    const wheelNode = (
      <RouletteWheel
        phase={phase}
        round={round}
        winningNumber={winningNumber}
        spinStartedAt={gameState?.spinStartedAt}
        sizeClass={sizeClass}
        compactBadge={compactBadge}
      />
    );

    if (!isCompactScreen) {
      return wheelNode;
    }

    return (
      <button
        type="button"
        onClick={() => setIsWheelZoomed(true)}
        aria-label="Drehrad vergrößern"
        title="Drehrad vergrößern"
        className="group relative flex items-center justify-center rounded-full cursor-pointer transition-transform active:scale-95 focus:outline-none"
      >
        {wheelNode}
        <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#FBBF24]/75 bg-[#0F172A]/90 text-[#FDE68A]">
          <ZoomIn className="h-2.5 w-2.5" />
        </span>
      </button>
    );
  };

  const renderChipButton = (
    chip: (typeof CHIP_DENOMINATIONS)[number],
    variant: 'portrait' | 'landscape'
  ) => {
    const isSelected = selectedChip === chip.value;
    const chipDisabled =
      chip.value === 'all'
        ? effectiveBalance <= 0 || !canBet
        : effectiveBalance < chip.value || !canBet;
    const isBeingDragged = Boolean(canBet && dragChip?.value === chip.value);
    const isPortraitVariant = variant === 'portrait';

    return (
      <button
        key={String(chip.value)}
        type="button"
        draggable={false}
        disabled={chipDisabled}
        onPointerDown={(e) => handleChipPointerDown(e, chip)}
        onClick={() => setSelectedChip(chip.value)}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          backgroundColor: chip.bg,
          borderColor: isSelected ? '#FFFFFF' : chip.border,
          color: chip.text,
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
        }}
        className={`touch-none select-none font-arcade inline-flex items-center justify-center rounded-full border-2 border-dashed transition-transform cursor-grab active:cursor-grabbing active:scale-95 ${
          isPortraitVariant
            ? 'h-9.5 w-9.5 min-[390px]:h-11 min-[390px]:w-11 sm:h-12 sm:w-12 px-0.5 text-[9px] min-[390px]:text-[10px]'
            : 'h-7 min-w-7 sm:h-8 sm:min-w-8 px-1.5 text-[9px] sm:text-[11px] shadow'
        } ${
          isSelected
            ? 'scale-105 ring-2 ring-[#FDE047] shadow-[0_0_10px_rgba(253,224,71,0.6)]'
            : 'opacity-90 hover:opacity-100'
        } ${chipDisabled ? 'opacity-40 cursor-not-allowed' : ''} ${
          isBeingDragged ? 'opacity-45 scale-90' : ''
        }`}
      >
        {chip.value === 'all' ? 'MAX' : isPortraitVariant ? chip.label : `${chip.label}€`}
      </button>
    );
  };

  const renderActionButtons = (variant: 'portrait' | 'landscape') => {
    const isPortraitVariant = variant === 'portrait';
    const baseBtnClass = isPortraitVariant
      ? 'font-arcade inline-flex h-9 w-9 min-[390px]:h-10 min-[390px]:w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border text-[10px] transition-colors disabled:opacity-35 cursor-pointer'
      : 'font-arcade inline-flex h-7 items-center gap-1 rounded-lg border px-1.5 text-[10px] uppercase disabled:opacity-35 cursor-pointer';

    return (
      <>
        <button
          type="button"
          disabled={!canBet || displayedWagered === 0}
          onClick={() => {
            setPendingDrops([]);
            onMove({ type: 'undo_bet' });
          }}
          title="Letzten Chip zurücknehmen"
          aria-label="Letzten Chip zurücknehmen"
          className={`${baseBtnClass} border-white/20 bg-white/[0.06] text-white hover:bg-white/12`}
        >
          <RotateCcw className={isPortraitVariant ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
        </button>

        <button
          type="button"
          disabled={!canBet || !canRebet}
          onClick={() => {
            setPendingDrops([]);
            onMove({ type: 'rebet' });
          }}
          title="Einsätze der letzten Runde wiederholen"
          aria-label="Einsätze der letzten Runde wiederholen"
          className={`${baseBtnClass} border-white/20 bg-white/[0.06] text-white hover:bg-white/12`}
        >
          <Repeat className={isPortraitVariant ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
        </button>

        <button
          type="button"
          disabled={!canBet || !canDouble}
          onClick={() => {
            setPendingDrops([]);
            onMove({ type: 'double_bets' });
          }}
          title="Einsätze verdoppeln"
          aria-label="Einsätze verdoppeln"
          className={`${baseBtnClass} border-white/20 bg-white/[0.06] text-[#FDE68A] hover:bg-white/12`}
        >
          2×
        </button>

        <button
          type="button"
          disabled={!canBet || displayedWagered === 0}
          onClick={() => {
            setPendingDrops([]);
            onMove({ type: 'clear_bets' });
          }}
          title="Alle Einsätze löschen"
          aria-label="Alle Einsätze löschen"
          className={`${baseBtnClass} border-[#FDA4AF]/35 bg-[#E11D48]/15 text-[#FECDD3] hover:bg-[#E11D48]/25`}
        >
          <Trash2 className={isPortraitVariant ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
        </button>

        {!isMultiplayer &&
          (isPortraitVariant ? (
            <button
              type="button"
              disabled={Boolean(disabled) || phase !== 'betting' || isLocked}
              onClick={() => {
                setPendingDrops([]);
                onMove({ type: 'lock_bets' });
              }}
              title="Jetzt drehen"
              aria-label="Jetzt drehen"
              className="font-arcade inline-flex h-10 w-10 min-[390px]:h-11 min-[390px]:w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-[#34D399]/75 bg-[#059669] text-white hover:bg-[#10B981] disabled:opacity-40 cursor-pointer transition-transform active:scale-95"
            >
              <Check className="h-4 w-4 stroke-[3]" />
            </button>
          ) : (
            <OpenButton
              size="sm"
              variant="primary"
              disabled={Boolean(disabled) || phase !== 'betting' || isLocked}
              onClick={() => {
                setPendingDrops([]);
                onMove({ type: 'lock_bets' });
              }}
              className="h-7! px-2.5! text-[10px]! min-w-[82px]"
            >
              <Check className="h-3 w-3 stroke-[3]" />
              <span>
                {phase === 'spinning' ? 'DREHT...' : isLocked ? 'BEREIT' : 'DREHEN!'}
              </span>
            </OpenButton>
          ))}
      </>
    );
  };

  const playersStrip = isMultiplayer && (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 px-0.5">
      {rankedPlayers.map((p, idx) => {
        const bal = gameState?.scores?.[p.id] ?? startingBalance;
        const pNet = gameState?.lastOutcome?.netProfit?.[p.id];
        const isMe = p.id === myId;
        const marker = playerMarkers.get(p.id);
        const chipBg = marker?.theme.color || '#F59E0B';
        const chipBorder = marker?.theme.border || '#FEF08A';
        const chipText = marker?.theme.text || '#0F172A';
        const shortTag = marker?.shortTag || `S${idx + 1}`;
        return (
          <div key={p.id} className="flex shrink-0 items-center gap-1 py-0.5">
            <span
              title={`${p.name} (${shortTag})`}
              style={{
                backgroundColor: chipBg,
                borderColor: chipBorder,
                color: chipText,
              }}
              className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full border border-dashed px-0.5 font-arcade text-[7px] leading-none ring-1 ring-[#0F172A]"
            >
              {shortTag}
            </span>
            <span className={`inline-flex rounded-full ${isMe ? 'ring-1 ring-[#34D399]' : ''}`}>
              <Avatar config={p.avatar} size={14} />
            </span>
            <span
              className={`font-arcade text-[9px] uppercase max-w-[52px] sm:max-w-[74px] truncate ${
                isMe ? 'text-[#6EE7B7]' : 'text-white'
              }`}
            >
              {p.name}
            </span>
            <span className="font-arcade text-[9px] text-[#FDE68A]">{formatEuro(bal)}</span>
            {phase === 'result' && typeof pNet === 'number' && pNet !== 0 && (
              <span
                className={`font-arcade text-[9px] ${
                  pNet > 0 ? 'text-[#34D399]' : 'text-[#FCA5A5]'
                }`}
              >
                {formatSignedEuro(pNet)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  const activePreviewLabel = canBet ? formatBetLabel(hoveredBetKey ?? tableHoverBetKey) : null;

  const resultFooter = phase === 'result' && (
    <div className="flex shrink-0 items-center justify-between gap-2 px-0.5 py-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <Trophy className="h-3.5 w-3.5 shrink-0 text-[#FBBF24]" />
        <span className="font-arcade text-[11px] text-[#CBD5E1] uppercase truncate">
          {round >= maxRounds ? `FINALE (${timeLeft}S)` : `WEITER (${timeLeft}S)`}
        </span>
      </div>

      <OpenButton
        size="sm"
        variant="primary"
        disabled={isNextReady || Boolean(disabled)}
        onClick={() => onMove({ type: 'next_round' })}
      >
        {isNextReady
          ? `WARTE (${nextReadyCount}/${allPlayers.length})...`
          : round >= maxRounds
            ? 'ENDERGEBNIS'
            : 'NÄCHSTE RUNDE'}
      </OpenButton>
    </div>
  );

  const winningStatusLabel =
    winningNumber !== null
      ? `ZAHL ${winningNumber} ${
          winningNumber === 0
            ? '(GRÜN)'
            : getRouletteColor(winningNumber) === 'red'
              ? '(ROT)'
              : '(SCHWARZ)'
        }`
      : '';

  return (
    <>
      {/* ─── HOCHFORMAT-ANSICHT (SMARTPHONES & PORTRAIT-TABLETS WIE CASINO-VORLAGE) ─── */}
      <div className="roulette-stage-portrait flex sm:hidden w-full max-w-2xl flex-1 min-h-0 flex-col justify-between gap-1.5 overflow-y-auto overflow-x-hidden py-0.5">
        {/* Obere kompakte Verlaufs-, Runden- & Statuszeile (ohne dunkle Container-Box) */}
        <div className="flex shrink-0 flex-col gap-0.5 px-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto no-scrollbar">
              {history.length === 0 ? (
                <span className="font-arcade text-[10px] text-white/50 uppercase whitespace-nowrap">
                  NOCH KEINE ZIEHUNG
                </span>
              ) : (
                history.slice(0, 7).map((item, idx) => (
                  <span
                    key={`${item.round}-${idx}`}
                    className={`inline-flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded border px-1 font-arcade text-[9px] ${getColorClasses(
                      item.color
                    )} ${idx === 0 ? 'ring-1 ring-[#FDE047]' : 'opacity-80'}`}
                  >
                    {item.number}
                  </span>
                ))
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="font-arcade text-[10px] text-[#6EE7B7] uppercase">
                R {round}/{maxRounds}
              </span>
              {phase === 'betting' && (
                <span
                  className={`font-arcade inline-flex items-center gap-1 text-[10px] ${
                    timeLeft <= 5 ? 'text-[#FDA4AF] animate-pulse' : 'text-white/90'
                  }`}
                >
                  <Clock className="h-2.5 w-2.5" />
                  {timeLeft}S
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            {phase === 'result' && winningNumber !== null ? (
              <span className="font-arcade text-[10px] text-[#FEF08A] uppercase truncate">
                {winningStatusLabel}
                {myOutcomeWager > 0 ? (
                  <span
                    className={`ml-1.5 ${
                      myOutcomeNet > 0
                        ? 'text-[#34D399]'
                        : myOutcomeNet < 0
                          ? 'text-[#FCA5A5]'
                          : 'text-[#CBD5E1]'
                    }`}
                  >
                    ·{' '}
                    {myOutcomePayout > 0
                      ? `+${formatEuro(myOutcomePayout)} (${formatSignedEuro(myOutcomeNet)})`
                      : formatSignedEuro(myOutcomeNet)}
                  </span>
                ) : (
                  <span className="ml-1.5 text-[#94A3B8]">· KEIN EINSATZ</span>
                )}
              </span>
            ) : phase === 'spinning' ? (
              <span className="font-arcade text-[10px] text-[#FDE68A] uppercase animate-pulse">
                KUGEL LÄUFT...
              </span>
            ) : (
              <span className="font-arcade text-[10px] text-[#FDE68A] uppercase">
                EINSATZ: {formatEuro(displayedWagered)}
              </span>
            )}

            {phase === 'betting' && (
              <span
                className={`font-arcade text-[9px] uppercase shrink-0 ${
                  activePreviewLabel ? 'text-[#FDE047]' : 'text-[#6EE7B7]'
                }`}
              >
                {activePreviewLabel ?? (!isMultiplayer && isLocked ? 'BEREIT ✓' : 'CHIPS ZIEHEN')}
              </span>
            )}
          </div>
        </div>

        {/* Mittlere 3-Spalten-Bühne: Links (Drehrad + Aktionen) | Mitte (Hochformat-Tisch) | Rechts (Chips) */}
        <div className="grid w-full flex-1 min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] items-stretch gap-1.5 min-[390px]:gap-2 sm:gap-4 px-0.5">
          {/* Linke Leiste: Klickbares Mini-Drehrad oben + Aktions-Buttons vertikal darunter */}
          <div className="flex shrink-0 flex-col items-center justify-between gap-2 py-0.5">
            {renderWheelControl(
              'h-12 w-12 min-[390px]:h-14 min-[390px]:w-14 sm:h-16 sm:w-16',
              true
            )}

            <div className="mt-auto flex flex-col items-center gap-1.5 sm:gap-2">
              {renderActionButtons('portrait')}
            </div>
          </div>

          {/* Mitte: Vertikales Roulette-Tableau */}
          <div className="my-auto flex h-full max-h-[min(100%,640px)] min-h-0 min-w-0 flex-col justify-center">
            <BettingTable
              allBets={displayedTableBets}
              players={allPlayers}
              myPlayerId={myId}
              isTvScreen={false}
              canBet={canBet}
              winningNumber={winningNumber}
              phase={phase}
              hoveredBetKey={canBet && dragChip ? hoveredBetKey : null}
              layout="portrait"
              onHoverBetChange={setTableHoverBetKey}
              onPlaceBet={handlePlaceBet}
            />
          </div>

          {/* Rechte Leiste: Vertikale Poker-Chips (per Drag-and-Drop oder Tap) */}
          <div className="flex shrink-0 flex-col items-center justify-center gap-2 sm:gap-2.5 py-0.5 touch-none select-none">
            {CHIP_DENOMINATIONS.map((chip) => renderChipButton(chip, 'portrait'))}
          </div>
        </div>

        {playersStrip}
        {resultFooter}
      </div>

      {/* ─── QUERFORMAT / DESKTOP / TABLET HORIZONTAL-ANSICHT ─── */}
      <div className="roulette-landscape-shell hidden sm:flex w-full max-w-6xl flex-1 min-h-0 flex-col justify-between gap-2 lg:gap-4 overflow-y-auto overflow-x-hidden lg:overflow-hidden py-0.5">
        {/* 1. OBERE INFO-LEISTE OBERHALB DES SPIELFELDS: GEZOGENE ZAHLEN · EINSATZ · RUNDE & ZEIT */}
        <div className="roulette-landscape-topbar grid w-full shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4 px-1">
          {/* Links: Gezogene Zahlen (Verlauf) */}
          <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto no-scrollbar justify-self-start">
            <span className="hidden md:inline font-arcade text-[10px] tracking-wider text-[#94A3B8] uppercase shrink-0">
              VERLAUF
            </span>
            {history.length === 0 ? (
              <span className="font-arcade text-[10px] text-white/50 uppercase whitespace-nowrap">
                NOCH KEINE ZIEHUNG
              </span>
            ) : (
              history.slice(0, 10).map((item, idx) => (
                <span
                  key={`${item.round}-${idx}`}
                  className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded border px-1 font-arcade text-[10px] ${getColorClasses(
                    item.color
                  )} ${idx === 0 ? 'ring-1 ring-[#FDE047]' : 'opacity-80'}`}
                >
                  {item.number}
                </span>
              ))
            )}
          </div>

          {/* Mitte: Aktueller Einsatz + Live-Vorschau / Spin / Ergebnis */}
          <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 justify-self-center text-center">
            {phase === 'betting' && (
              <>
                <span className="font-arcade text-[11px] sm:text-xs text-[#FDE68A] uppercase whitespace-nowrap">
                  EINSATZ: {formatEuro(displayedWagered)}
                </span>
                <span
                  className={`font-arcade text-[10px] sm:text-[11px] uppercase whitespace-nowrap ${
                    activePreviewLabel ? 'text-[#FDE047]' : 'text-[#6EE7B7]'
                  }`}
                >
                  {activePreviewLabel ?? (!isMultiplayer && isLocked ? 'BEREIT ✓' : 'CHIPS ZIEHEN')}
                </span>
              </>
            )}

            {phase === 'spinning' && (
              <>
                <span className="font-arcade text-xs text-[#FDE68A] uppercase animate-pulse whitespace-nowrap">
                  KUGEL LÄUFT...
                </span>
                <span className="font-arcade text-[11px] text-[#CBD5E1] uppercase whitespace-nowrap">
                  EINSATZ: {formatEuro(displayedWagered)}
                </span>
              </>
            )}

            {phase === 'result' && winningNumber !== null && (
              <>
                <span className="font-arcade text-xs text-[#FEF08A] uppercase whitespace-nowrap">
                  {winningStatusLabel}
                </span>
                {myOutcomeWager > 0 ? (
                  <span
                    className={`font-arcade text-[11px] uppercase whitespace-nowrap ${
                      myOutcomeNet > 0
                        ? 'text-[#34D399]'
                        : myOutcomeNet < 0
                          ? 'text-[#FCA5A5]'
                          : 'text-[#CBD5E1]'
                    }`}
                  >
                    {myOutcomePayout > 0
                      ? `+${formatEuro(myOutcomePayout)} (${formatSignedEuro(myOutcomeNet)})`
                      : formatSignedEuro(myOutcomeNet)}
                  </span>
                ) : (
                  <span className="font-arcade text-[10px] text-[#94A3B8] uppercase whitespace-nowrap">
                    KEIN EINSATZ
                  </span>
                )}
              </>
            )}
          </div>

          {/* Rechts: Runde & Zeit */}
          <div className="flex shrink-0 items-center gap-2.5 justify-self-end">
            <span className="font-arcade text-[10px] sm:text-xs text-[#6EE7B7] uppercase whitespace-nowrap">
              R {round}/{maxRounds}
            </span>
            {phase === 'betting' && (
              <span
                className={`font-arcade inline-flex items-center gap-1 text-[10px] sm:text-xs whitespace-nowrap ${
                  timeLeft <= 5 ? 'text-[#FDA4AF] animate-pulse' : 'text-white/95'
                }`}
              >
                <Clock className="h-3 w-3" />
                {timeLeft}S
              </span>
            )}
          </div>
        </div>

        {/* 2. MITTE: DREHRAD (LINKS) & SPIELBRETT (RECHTS) EXAKT AUF EINER LINIE + CHIPS MITTIG DARUNTER */}
        <div className="roulette-landscape-body my-auto grid w-full min-h-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 md:gap-x-6 lg:gap-x-8 xl:gap-x-10 gap-y-2.5">
          {/* Reihe 1, Links: Nur das Drehrad — exakt vertikal zentriert mit dem Spielbrett */}
          <div className="roulette-wheel-wrap flex items-center justify-center shrink-0 self-center">
            {renderWheelControl(
              phase === 'spinning'
                ? 'roulette-landscape-wheel w-28 sm:w-32 md:w-44 lg:w-[min(276px,44vh)] xl:w-[min(340px,50vh)] 2xl:w-[min(380px,54vh)] aspect-square'
                : 'roulette-landscape-wheel w-24 sm:w-28 md:w-40 lg:w-[min(264px,42vh)] xl:w-[min(328px,48vh)] 2xl:w-[min(372px,52vh)] aspect-square',
              isCompactScreen
            )}
          </div>

          {/* Reihe 1, Rechts: Spielbrett — auf derselben horizontalen Linie wie das Drehrad */}
          <div className="flex min-w-0 items-center self-center">
            <BettingTable
              allBets={displayedTableBets}
              players={allPlayers}
              myPlayerId={myId}
              isTvScreen={false}
              canBet={canBet}
              winningNumber={winningNumber}
              phase={phase}
              hoveredBetKey={canBet && dragChip ? hoveredBetKey : null}
              layout="horizontal"
              onHoverBetChange={setTableHoverBetKey}
              onPlaceBet={handlePlaceBet}
            />
          </div>

          {/* Reihe 2, Rechts: Chips mittig direkt unterhalb des Spielbrettes (+ Aktionen & Spieler) */}
          <div className="col-start-2 flex w-full min-w-0 flex-col items-center gap-1.5 self-start">
            {phase === 'result' ? (
              <div className="flex w-full items-center justify-center">
                {resultFooter}
              </div>
            ) : (
              <div className="flex w-full flex-col min-[760px]:grid min-[760px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 px-0.5 py-0.5">
                <div className="hidden min-[760px]:block" aria-hidden="true" />

                {/* Ziehbarer Spielstein-Vorrat (mittig unter dem Spielbrett) */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 touch-none select-none min-[760px]:justify-self-center">
                  {CHIP_DENOMINATIONS.map((chip) => renderChipButton(chip, 'landscape'))}
                </div>

                {/* Aktionen: Undo, Rebet, 2x, Clear (+ Drehen nur im Solo-Modus) */}
                <div className="flex items-center justify-center gap-1 min-[760px]:justify-self-end">
                  {renderActionButtons('landscape')}
                </div>
              </div>
            )}

            {playersStrip}
          </div>
        </div>
      </div>

      {/* Vergrößertes Drehrad auf kleinen Bildschirmen (schließt automatisch bei Klick daneben) */}
      {isWheelZoomed &&
        isCompactScreen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Vergrößertes Roulette-Drehrad"
            onClick={() => setIsWheelZoomed(false)}
            className="fixed inset-0 z-[9990] flex flex-col items-center justify-center gap-3 bg-[#020617]/75 backdrop-blur-sm p-4 animate-fade-in cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center justify-center gap-3 cursor-default"
            >
              <RouletteWheel
                phase={phase}
                round={round}
                winningNumber={winningNumber}
                spinStartedAt={gameState?.spinStartedAt}
                sizeClass="w-[min(84vw,68vh,360px)] aspect-square"
              />

              <div className="flex flex-col items-center gap-1 text-center">
                <span className="font-arcade text-xs text-[#FDE68A] uppercase">
                  {phase === 'betting'
                    ? `RUNDE ${round}/${maxRounds} · NOCH ${timeLeft}S`
                    : phase === 'spinning'
                      ? 'KUGEL LÄUFT...'
                      : winningNumber !== null
                        ? winningStatusLabel
                        : `RUNDE ${round}/${maxRounds}`}
                </span>
                {phase === 'result' && myOutcomeWager > 0 && (
                  <span
                    className={`font-arcade text-xs uppercase ${
                      myOutcomeNet > 0
                        ? 'text-[#34D399]'
                        : myOutcomeNet < 0
                          ? 'text-[#FCA5A5]'
                          : 'text-[#CBD5E1]'
                    }`}
                  >
                    {myOutcomePayout > 0
                      ? `+${formatEuro(myOutcomePayout)} (${formatSignedEuro(myOutcomeNet)})`
                      : formatSignedEuro(myOutcomeNet)}
                  </span>
                )}
              </div>
            </div>

            <span className="font-arcade text-[10px] tracking-wider text-white/65 uppercase">
              ZUM SCHLIESSEN DANEBEN TIPPEN
            </span>
          </div>,
          document.body
        )}

      {/* Schwebender Spielstein im Portal (frei von CSS-Transforms) während Touch-/Maus-Drag */}
      {canBet &&
        dragChip &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={(el) => {
              ghostChipRef.current = el;
              if (el) {
                const { x, y } = dragPosRef.current;
                el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
              }
            }}
            style={{
              backgroundColor: dragChip.bg,
              borderColor: dragChip.border,
              color: dragChip.text,
            }}
            className="pointer-events-none fixed top-0 left-0 z-[9999] inline-flex h-10 min-w-10 items-center justify-center rounded-full border-2 border-dashed px-2 font-arcade text-xs shadow-[0_14px_30px_rgba(0,0,0,0.75)] ring-2 ring-[#FDE047] will-change-transform"
          >
            {dragChip.label}
          </div>,
          document.body
        )}
    </>
  );
}
