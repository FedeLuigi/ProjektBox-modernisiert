import { useEffect, useRef, useState } from 'react';
import { Timer, Trophy, Zap } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { CrystalReadout } from '../../components/CrystalUI';
import {
  playErrorSound,
  playMoveSound,
  playScoreSound,
  playWinSound,
} from '../../utils/soundEffects';

type Phase = 'idle' | 'waiting' | 'ready' | 'early' | 'done';

const TOTAL_ROUNDS = 5;

function getRatingLabel(ms: number): string {
  if (ms < 185) return 'LICHTGESCHWINDIGKEIT ⚡';
  if (ms < 235) return 'PROFI-REFLEX 🔥';
  if (ms < 290) return 'SEHR SCHNELL ✨';
  return 'SOLIDE REAKTION 👍';
}

export function ReactionBoard({
  isGameOver,
  disabled,
  onMove,
}: GameRendererProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [attempts, setAttempts] = useState<number[]>([]);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const startWaiting = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    playMoveSound();
    setPhase('waiting');
    const delay = 1200 + Math.floor(Math.random() * 2300);
    timerRef.current = setTimeout(() => {
      startTimeRef.current = performance.now();
      setPhase('ready');
    }, delay);
  };

  const handleTap = () => {
    if (isGameOver || disabled || phase === 'done') return;

    if (phase === 'idle' || phase === 'early') {
      startWaiting();
      return;
    }

    if (phase === 'waiting') {
      if (timerRef.current) clearTimeout(timerRef.current);
      playErrorSound();
      setPhase('early');
      return;
    }

    if (phase === 'ready') {
      const elapsed = Math.max(45, Math.round(performance.now() - startTimeRef.current));
      const nextAttempts = [...attempts, elapsed];
      setAttempts(nextAttempts);
      setLastMs(elapsed);

      const avgSoFar = Math.round(
        nextAttempts.reduce((a, b) => a + b, 0) / nextAttempts.length
      );

      if (nextAttempts.length >= TOTAL_ROUNDS) {
        const best = Math.min(...nextAttempts);
        playWinSound();
        setPhase('done');
        onMove({
          score: avgSoFar,
          isAbsolute: true,
          finish: true,
          label: `Ø ${avgSoFar} MS (BEST: ${best} MS)`,
          lowerIsBetter: true,
        });
      } else {
        playScoreSound(nextAttempts.length);
        onMove({ score: avgSoFar, isAbsolute: true, lowerIsBetter: true });
        setPhase('idle');
      }
    }
  };

  const bestMs = attempts.length > 0 ? Math.min(...attempts) : null;
  const avgMs =
    attempts.length > 0
      ? Math.round(attempts.reduce((a, b) => a + b, 0) / attempts.length)
      : null;

  return (
    <div className="flex h-full w-full max-w-6xl flex-1 min-h-0 flex-col lg:grid lg:grid-cols-[1fr_19rem] landscape:grid landscape:grid-cols-[1fr_16.5rem] items-stretch justify-center gap-3 sm:gap-5 px-1 sm:px-3 py-1 select-none">
      {/* GROSSFLÄCHIGE REAKTIONS-ARENA (nimmt den gesamten Hauptbereich ein) */}
      <button
        type="button"
        onPointerDown={handleTap}
        className={`relative w-full flex-1 min-h-[46dvh] sm:min-h-[56dvh] landscape:min-h-0 h-full flex flex-col items-center justify-center gap-3 sm:gap-4 p-6 sm:p-10 text-center transition-all duration-150 active:scale-[0.99] cursor-pointer border-[4px] overflow-hidden ${
          phase === 'ready'
            ? 'bg-[#059669] text-white border-[#064E3B] shadow-[inset_0_0_0_5px_#6EE7B7,0_12px_28px_rgba(6,78,59,0.5)]'
            : phase === 'waiting'
              ? 'bg-[#D97706] text-white border-[#78350F] shadow-[inset_0_0_0_5px_#FCD34D,0_12px_28px_rgba(120,53,15,0.5)]'
              : phase === 'early'
                ? 'bg-[#E11D48] text-white border-[#881337] shadow-[inset_0_0_0_5px_#FDA4AF,0_12px_28px_rgba(136,19,55,0.5)] screen-shake'
                : 'bg-[#F8FAFC] text-[#1E293B] border-[#334155] shadow-[inset_0_0_0_5px_#E2E8F0,0_12px_28px_rgba(15,23,42,0.45)]'
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-white/15"
          style={{ clipPath: 'polygon(0 0, 56% 0, 32% 100%, 0 100%)' }}
        />

        {/* Spannungs-Ringe während der Wartephase */}
        {phase === 'waiting' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-44 w-44 sm:h-64 sm:w-64 rounded-full border-4 border-white/25 animate-ping" />
          </div>
        )}

        <Zap
          className={`relative z-10 h-14 w-14 sm:h-20 sm:w-20 landscape:h-12 landscape:w-12 transition-transform ${
            phase === 'ready'
              ? 'fill-current animate-bounce text-[#FEF3C7] scale-110'
              : phase === 'idle'
                ? 'text-[#059669]'
                : ''
          }`}
        />

        <span className="relative z-10 text-2xl sm:text-4xl md:text-5xl landscape:text-2xl font-arcade uppercase tracking-wider">
          {phase === 'idle' &&
            (attempts.length === 0 ? 'TIPPEN ZUM STARTEN' : 'TIPPEN FÜR NÄCHSTE RUNDE')}
          {phase === 'waiting' && 'WARTE AUF GRÜN…'}
          {phase === 'ready' && 'JETZT TIPPEN!'}
          {phase === 'early' && 'ZU FRÜH! TIPPE FÜR NEUSTART'}
          {phase === 'done' && 'SERIE ABGESCHLOSSEN!'}
        </span>

        {lastMs !== null && phase === 'idle' && (
          <div className="relative z-10 mt-1 flex flex-col items-center gap-1">
            <span className="bg-[#059669] text-white border-2 border-[#064E3B] px-4 py-1 text-base sm:text-xl font-arcade shadow-md">
              {lastMs} MS
            </span>
            <span className="text-xs sm:text-sm font-arcade text-[#047857] uppercase">
              {getRatingLabel(lastMs)}
            </span>
          </div>
        )}
      </button>

      {/* Statistik- & Runden-Dashboard (unten im Hochformat, rechts im Querformat/Desktop) */}
      <aside className="flex flex-col justify-between gap-2.5 bg-[#F8FAFC] border-[3px] border-[#334155] shadow-[inset_0_0_0_3px_#FFFFFF,0_8px_0_rgba(15,23,42,0.35)] p-3 sm:p-4 shrink-0">
        <div className="grid grid-cols-3 lg:grid-cols-1 landscape:grid-cols-1 gap-2">
          <CrystalReadout
            label="RUNDE"
            value={`${Math.min(attempts.length + (phase === 'done' ? 0 : 1), TOTAL_ROUNDS)} / ${TOTAL_ROUNDS}`}
          />
          <CrystalReadout
            variant="emerald"
            label="Ø ZEIT"
            value={avgMs !== null ? `${avgMs} MS` : '---'}
          />
          <CrystalReadout
            variant="gold"
            label="BESTZEIT"
            value={bestMs !== null ? `${bestMs} MS` : '---'}
          />
        </div>

        {/* 5 Runden-Slots */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-[#CBD5E1]">
          <div className="flex items-center justify-between text-[11px] font-arcade text-[#475569] uppercase">
            <span className="inline-flex items-center gap-1">
              <Timer className="h-3.5 w-3.5" /> RUNDEN-PROTOKOLL
            </span>
            {bestMs !== null && (
              <span className="inline-flex items-center gap-1 text-[#D97706]">
                <Trophy className="h-3.5 w-3.5" /> {bestMs} MS
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
              const val = attempts[i];
              const isBest = val !== undefined && val === bestMs && attempts.length > 1;
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 border-2 font-arcade ${
                    val !== undefined
                      ? isBest
                        ? 'bg-[#FEF3C7] border-[#D97706] text-[#78350F]'
                        : 'bg-[#1E293B] border-[#0F172A] text-[#6EE7B7]'
                      : 'bg-[#E2E8F0] border-[#94A3B8] text-[#64748B]'
                  }`}
                >
                  <span className="text-[9px] opacity-75">R{i + 1}</span>
                  <span className="text-xs sm:text-sm">{val !== undefined ? `${val}` : '--'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
