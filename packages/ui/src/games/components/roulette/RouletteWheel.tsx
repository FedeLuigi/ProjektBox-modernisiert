import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ROULETTE_WHEEL_NUMBERS, SPIN_DURATION_MS } from '@projektbox/shared/utils';
import { getRouletteColor } from '../rouletteBets';
import turretSpriteUrl from '../../../assets/textures/roulette/sprites/wheel_turret.png';
import { rouletteAudio } from './rouletteAudio';

interface RouletteWheelProps {
  phase: 'betting' | 'spinning' | 'result' | 'game_over';
  winningNumber: number | null;
  spinStartedAt?: number;
  sizeClass?: string;
}

const SLICE_COUNT = ROULETTE_WHEEL_NUMBERS.length; // 37
const SLICE_DEG = 360 / SLICE_COUNT;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeSlice(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startDeg: number,
  endDeg: number
) {
  const p1 = polarToCartesian(cx, cy, rOuter, startDeg);
  const p2 = polarToCartesian(cx, cy, rOuter, endDeg);
  const p3 = polarToCartesian(cx, cy, rInner, endDeg);
  const p4 = polarToCartesian(cx, cy, rInner, startDeg);
  return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 0 0 ${p4.x} ${p4.y} Z`;
}

export function RouletteWheel({
  phase,
  winningNumber,
  spinStartedAt,
  sizeClass = 'w-64 h-64 sm:w-80 sm:h-80 lg:w-[340px] lg:h-[340px]',
}: RouletteWheelProps) {
  const uid = useId().replace(/:/g, '');
  const [wheelDeg, setWheelDeg] = useState(0);
  const [ballDeg, setBallDeg] = useState(0);
  const [ballRadius, setBallRadius] = useState(146);
  const [showBall, setShowBall] = useState(false);

  const lastTickAngleRef = useRef(0);
  const settledSoundRef = useRef<number | null>(null);

  const slices = useMemo(
    () =>
      ROULETTE_WHEEL_NUMBERS.map((num, idx) => {
        const centerDeg = idx * SLICE_DEG;
        const startDeg = centerDeg - SLICE_DEG / 2;
        const endDeg = centerDeg + SLICE_DEG / 2;
        const color = getRouletteColor(num);
        return { num, idx, centerDeg, startDeg, endDeg, color };
      }),
    []
  );

  // Idle slow rotation during betting; precision physics spin during spinning
  useEffect(() => {
    let rafId = 0;

    if (phase === 'betting') {
      setShowBall(false);
      settledSoundRef.current = null;
      let last = performance.now();
      const tickIdle = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        setWheelDeg((prev) => (prev + dt * 10) % 360);
        rafId = requestAnimationFrame(tickIdle);
      };
      rafId = requestAnimationFrame(tickIdle);
      return () => cancelAnimationFrame(rafId);
    }

    if (phase === 'spinning' && winningNumber !== null) {
      setShowBall(true);
      const targetIdx = (ROULETTE_WHEEL_NUMBERS as readonly number[]).indexOf(winningNumber);
      const pocketLocalDeg = Math.max(0, targetIdx) * SLICE_DEG;
      const startTime = spinStartedAt ?? Date.now();
      const baseWheelStart = wheelDeg;
      const totalWheelTurn = 720 + 180; // 2.5 smooth wheel turns
      const finalWheelDeg = baseWheelStart + totalWheelTurn;
      const targetWorldDeg = finalWheelDeg + pocketLocalDeg;
      // Ball spins counter-clockwise ~6 full turns before settling in exact pocket
      const startBallDeg = targetWorldDeg + 360 * 6;

      const tickSpin = () => {
        const elapsed = Math.max(0, Date.now() - startTime);
        const t = Math.min(1, elapsed / SPIN_DURATION_MS);
        const easeOutCubic = 1 - Math.pow(1 - t, 3);
        const easeOutQuart = 1 - Math.pow(1 - t, 4);

        const curWheel = baseWheelStart + totalWheelTurn * easeOutCubic;
        setWheelDeg(curWheel);

        const curBall = startBallDeg + (targetWorldDeg - startBallDeg) * easeOutQuart;
        setBallDeg(curBall);

        // Radial drop with subtle pocket bounce between t=0.58 and t=0.88
        if (t < 0.58) {
          setBallRadius(148);
        } else if (t < 0.88) {
          const dropT = (t - 0.58) / 0.3;
          const bounce = Math.abs(Math.sin(dropT * Math.PI * 3)) * (1 - dropT) * 12;
          setBallRadius(148 - dropT * 42 + bounce);
        } else {
          setBallRadius(106);
          if (settledSoundRef.current !== startTime) {
            settledSoundRef.current = startTime;
            rouletteAudio.playPocketSettle();
          }
        }

        if (t < 0.86 && Math.abs(curBall - lastTickAngleRef.current) > 28) {
          lastTickAngleRef.current = curBall;
          rouletteAudio.playBallTick(1.15 - t * 0.35);
        }

        if (t < 1) {
          rafId = requestAnimationFrame(tickSpin);
        }
      };

      rafId = requestAnimationFrame(tickSpin);
      return () => cancelAnimationFrame(rafId);
    }

    if ((phase === 'result' || phase === 'game_over') && winningNumber !== null) {
      setShowBall(true);
      const targetIdx = (ROULETTE_WHEEL_NUMBERS as readonly number[]).indexOf(winningNumber);
      const pocketLocalDeg = Math.max(0, targetIdx) * SLICE_DEG;
      setBallDeg(wheelDeg + pocketLocalDeg);
      setBallRadius(106);
    }

    return undefined;
  }, [phase, winningNumber, spinStartedAt]);

  const ballPos = polarToCartesian(180, 180, ballRadius, ballDeg);
  const winColor = winningNumber !== null ? getRouletteColor(winningNumber) : null;

  return (
    <div className="relative flex flex-col items-center">
      {/* Decorative Brass Crown Emblem at Top */}
      <div className="-mb-2.5 z-10 flex h-6 items-center justify-center">
        <svg viewBox="0 0 48 24" className="h-6 w-12 drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)]">
          <path
            d="M6 21 L4 7 L15 13 L24 3 L33 13 L44 7 L42 21 Z"
            fill="#FBBF24"
            stroke="#78350F"
            strokeWidth="2"
          />
          <circle cx="24" cy="3" r="2.2" fill="#FEF08A" />
          <circle cx="4" cy="7" r="2" fill="#FEF08A" />
          <circle cx="44" cy="7" r="2" fill="#FEF08A" />
        </svg>
      </div>

      {/* Main Mahogany & Gold Wheel */}
      <div className={`relative ${sizeClass} drop-shadow-[0_18px_36px_rgba(0,0,0,0.8)]`}>
        <svg viewBox="0 0 360 360" className="h-full w-full overflow-visible">
          <defs>
            <radialGradient id={`mahogany-${uid}`} cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#7C2D12" />
              <stop offset="60%" stopColor="#451208" />
              <stop offset="100%" stopColor="#1F0703" />
            </radialGradient>
            <linearGradient id={`goldrim-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="35%" stopColor="#D97706" />
              <stop offset="65%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>
            <radialGradient id={`ball-${uid}`} cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="65%" stopColor="#E5E7EB" />
              <stop offset="100%" stopColor="#9CA3AF" />
            </radialGradient>
          </defs>

          {/* Outer Mahogany Bowl & Brushed Gold Bezel */}
          <circle cx="180" cy="180" r="176" fill={`url(#goldrim-${uid})`} />
          <circle cx="180" cy="180" r="170" fill={`url(#mahogany-${uid})`} />
          <circle
            cx="180"
            cy="180"
            r="153"
            fill="none"
            stroke="#D97706"
            strokeWidth="2"
            strokeOpacity="0.6"
          />

          {/* 8 Brass Diamond Deflectors on Ball Track */}
          {Array.from({ length: 8 }, (_, i) => {
            const p = polarToCartesian(180, 180, 161, i * 45);
            return (
              <rect
                key={i}
                x={p.x - 3.5}
                y={p.y - 3.5}
                width="7"
                height="7"
                transform={`rotate(${i * 45 + 45} ${p.x} ${p.y})`}
                fill="#FDE047"
                stroke="#78350F"
                strokeWidth="1"
              />
            );
          })}

          {/* Rotating Wheel Rotor */}
          <g transform={`rotate(${wheelDeg} 180 180)`}>
            {slices.map((s) => {
              const fill =
                s.color === 'green' ? '#047857' : s.color === 'red' ? '#B91C1C' : '#111827';
              const pocketFill =
                s.color === 'green' ? '#065F46' : s.color === 'red' ? '#7F1D1D' : '#030712';
              const isWinner =
                (phase === 'result' || phase === 'game_over') && winningNumber === s.num;
              const textPos = polarToCartesian(180, 180, 129, s.centerDeg);

              return (
                <g key={s.num}>
                  <path
                    d={describeSlice(180, 180, 144, 112, s.startDeg, s.endDeg)}
                    fill={fill}
                    stroke="#D97706"
                    strokeWidth="0.9"
                  />
                  <path
                    d={describeSlice(180, 180, 112, 92, s.startDeg, s.endDeg)}
                    fill={pocketFill}
                    stroke="#FBBF24"
                    strokeWidth="0.8"
                  />
                  {isWinner && (
                    <path
                      d={describeSlice(180, 180, 144, 92, s.startDeg, s.endDeg)}
                      fill="#FDE047"
                      fillOpacity="0.28"
                      stroke="#FEF08A"
                      strokeWidth="2.2"
                    />
                  )}
                  <text
                    x={textPos.x}
                    y={textPos.y}
                    fill={isWinner ? '#FEF08A' : '#FEF3C7'}
                    fontSize="9.5"
                    fontWeight="800"
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${s.centerDeg} ${textPos.x} ${textPos.y})`}
                  >
                    {s.num}
                  </text>
                </g>
              );
            })}

            {/* Inner Mahogany Cone */}
            <circle cx="180" cy="180" r="92" fill={`url(#mahogany-${uid})`} stroke="#F59E0B" strokeWidth="2.5" />
            <circle cx="180" cy="180" r="68" fill="none" stroke="#B45309" strokeWidth="1.2" strokeOpacity="0.55" />

            {/* Ornate Golden 4-Arm Turret Sprite */}
            <image
              href={turretSpriteUrl}
              x="120"
              y="120"
              width="120"
              height="120"
              preserveAspectRatio="xMidYMid meet"
            />
          </g>

          {/* Ivory Roulette Ball */}
          {showBall && (
            <g>
              <circle cx={ballPos.x + 1.5} cy={ballPos.y + 2} r="6.2" fill="rgba(0,0,0,0.55)" />
              <circle
                cx={ballPos.x}
                cy={ballPos.y}
                r="6"
                fill={`url(#ball-${uid})`}
                stroke="#D1D5DB"
                strokeWidth="0.6"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Ornate Golden Plaque Under Wheel */}
      <div className="-mt-4 z-10 flex h-10 min-w-[170px] items-center justify-center rounded-xl border-2 border-[#D97706] bg-gradient-to-b from-[#451208] to-[#1F0703] px-5 shadow-[0_6px_18px_rgba(0,0,0,0.75)]">
        {(phase === 'result' || phase === 'game_over') && winningNumber !== null ? (
          <div className="flex items-center gap-2.5 leading-none">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white shadow ${
                winColor === 'green'
                  ? 'bg-emerald-600'
                  : winColor === 'red'
                    ? 'bg-red-600'
                    : 'bg-zinc-900 ring-1 ring-amber-400/50'
              }`}
            >
              {winningNumber}
            </span>
            <span className="font-serif text-base font-bold tracking-wider text-amber-200 uppercase">
              {winColor === 'green' ? 'ZERO' : winColor === 'red' ? 'ROT' : 'SCHWARZ'}
            </span>
          </div>
        ) : (
          <span className="font-serif text-xl font-bold tracking-widest text-amber-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">
            Roulette
          </span>
        )}
      </div>
    </div>
  );
}
