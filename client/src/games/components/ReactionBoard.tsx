import { useEffect, useRef, useState } from 'react';
import { Activity, Timer, Trophy, Zap } from 'lucide-react';
import type { GameRendererProps } from '../types';
import {
  playErrorSound,
  playMoveSound,
  playScoreSound,
  playWinSound,
  triggerHapticFeedback,
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
    triggerHapticFeedback(10);
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
      triggerHapticFeedback([30, 30]);
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
        triggerHapticFeedback([20, 40, 25]);
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
        triggerHapticFeedback(15);
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
    <div className="flex h-full w-full max-w-5xl flex-1 min-h-0 flex-col items-center justify-between gap-2.5 sm:gap-3.5 px-1 sm:px-3 py-1 select-none">
      {/* INTEGRIERTES TELEMETRIE-DASHBOARD (5 Runden-Kapseln + Ø & Bestzeit) */}
      <div className="flex flex-wrap items-center justify-between gap-2 w-full px-3 sm:px-4 py-2 bg-[#1F0E24]/95 border-[3px] border-[#FB7185] shadow-[0_8px_20px_rgba(0,0,0,0.45)] shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 font-arcade text-xs sm:text-sm uppercase">
          <span className="inline-flex items-center gap-1.5 text-[#FDA4AF]">
            <Activity className="h-4 w-4 text-[#F43F5E]" />
            RUNDE{' '}
            <strong className="text-white">
              {Math.min(attempts.length + (phase === 'done' ? 0 : 1), TOTAL_ROUNDS)}/{TOTAL_ROUNDS}
            </strong>
          </span>
          <span className="inline-flex items-center gap-1 text-[#A7F3D0]">
            <Timer className="h-3.5 w-3.5 text-[#34D399]" />
            Ø: <strong className="text-white">{avgMs !== null ? `${avgMs} MS` : '---'}</strong>
          </span>
          <span className="inline-flex items-center gap-1 text-[#FDE68A]">
            <Trophy className="h-3.5 w-3.5 text-[#FBBF24]" />
            BEST: <strong className="text-white">{bestMs !== null ? `${bestMs} MS` : '---'}</strong>
          </span>
        </div>

        {/* 5 Runden-Slots */}
        <div className="grid grid-cols-5 gap-1.5 w-full sm:w-auto">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
            const val = attempts[i];
            const isBest = val !== undefined && val === bestMs && attempts.length > 1;
            const isCurrent = i === attempts.length && phase !== 'done';
            return (
              <div
                key={i}
                className={`flex items-center justify-center gap-1 px-2 py-1 border-2 font-arcade text-xs transition-all ${
                  val !== undefined
                    ? isBest
                      ? 'bg-[#78350F] border-[#FBBF24] text-[#FEF3C7] shadow-[0_0_10px_rgba(251,191,36,0.45)]'
                      : 'bg-[#064E3B] border-[#34D399] text-[#A7F3D0]'
                    : isCurrent
                      ? 'bg-[#881337] border-[#FB7185] text-white'
                      : 'bg-[#0F172A]/80 border-[#475569] text-[#64748B]'
                }`}
              >
                <span className="text-[10px] opacity-75">R{i + 1}:</span>
                <span>{val !== undefined ? `${val}` : '--'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* VOLLFLÄCHIGE SENSOR-ARENA (nimmt den gesamten Hauptbereich ein) */}
      <button
        type="button"
        onPointerDown={handleTap}
        className={`relative w-full flex-1 min-h-[48dvh] sm:min-h-[60dvh] landscape:min-h-0 h-full flex flex-col items-center justify-center gap-3 sm:gap-4 p-6 sm:p-10 text-center transition-all duration-150 active:scale-[0.995] cursor-pointer border-[4px] overflow-hidden ${
          phase === 'ready'
            ? 'bg-gradient-to-br from-[#059669] via-[#10B981] to-[#047857] text-white border-[#A7F3D0] shadow-[inset_0_0_40px_rgba(167,243,208,0.45),0_0_40px_rgba(16,185,129,0.55)]'
            : phase === 'waiting'
              ? 'bg-gradient-to-br from-[#B45309] via-[#D97706] to-[#78350F] text-white border-[#FDE68A] shadow-[inset_0_0_30px_rgba(253,230,138,0.3),0_16px_36px_rgba(0,0,0,0.6)]'
              : phase === 'early'
                ? 'bg-gradient-to-br from-[#BE123C] via-[#E11D48] to-[#881337] text-white border-[#FDA4AF] shadow-[inset_0_0_30px_rgba(253,164,175,0.35)] screen-shake'
                : 'bg-gradient-to-br from-[#1E152A] via-[#150E20] to-[#0D0814] text-white border-[#FB7185] shadow-[inset_0_0_30px_rgba(244,63,94,0.18),0_16px_36px_rgba(0,0,0,0.65)]'
        }`}
      >
        {/* Konzentrische Radar-Zielringe im Hintergrund */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-56 w-56 sm:h-80 sm:w-80 rounded-full border border-white/10" />
          <div className="absolute h-80 w-80 sm:h-[28rem] sm:w-[28rem] rounded-full border border-white/5" />
          {phase === 'waiting' && (
            <div className="absolute h-44 w-44 sm:h-64 sm:w-64 rounded-full border-4 border-white/30 animate-ping" />
          )}
        </div>

        {/* Sensor-Kern-Emblem */}
        <div
          className={`relative z-10 grid h-20 w-20 sm:h-24 sm:w-24 landscape:h-16 landscape:w-16 place-items-center rounded-full border-[3px] transition-transform ${
            phase === 'ready'
              ? 'bg-white text-[#059669] border-[#A7F3D0] scale-110 shadow-[0_0_30px_#FFFFFF]'
              : phase === 'waiting'
                ? 'bg-[#78350F]/80 text-[#FEF3C7] border-[#FDE68A]'
                : phase === 'early'
                  ? 'bg-[#881337]/80 text-white border-[#FDA4AF]'
                  : 'bg-[#881337]/50 text-[#FB7185] border-[#FB7185]'
          }`}
        >
          <Zap
            className={`h-10 w-10 sm:h-12 sm:w-12 landscape:h-8 landscape:w-8 ${
              phase === 'ready' ? 'fill-current animate-bounce' : ''
            }`}
          />
        </div>

        <span className="relative z-10 text-2xl sm:text-4xl md:text-5xl landscape:text-2xl font-arcade uppercase tracking-wider drop-shadow-[0_3px_0_rgba(0,0,0,0.45)]">
          {phase === 'idle' &&
            (attempts.length === 0 ? 'SENSOR AKTIVIEREN (TIPPEN)' : 'NÄCHSTE MESSUNG STARTEN')}
          {phase === 'waiting' && 'ACHTUNG… WARTE AUF GRÜN!'}
          {phase === 'ready' && 'JETZT TIPPEN!'}
          {phase === 'early' && 'FEHLSTART! TIPPE FÜR NEUSTART'}
          {phase === 'done' && 'MESSREIHE ABGESCHLOSSEN!'}
        </span>

        {lastMs !== null && phase === 'idle' && (
          <div className="relative z-10 mt-1 flex flex-col items-center gap-1.5">
            <div className="bg-[#064E3B] text-[#6EE7B7] border-2 border-[#34D399] px-5 py-1.5 text-xl sm:text-3xl font-arcade shadow-[0_0_20px_rgba(16,185,129,0.45)]">
              {lastMs} MS
            </div>
            <span className="text-xs sm:text-sm font-arcade text-[#FDE68A] uppercase tracking-wider">
              {getRatingLabel(lastMs)}
            </span>
          </div>
        )}
      </button>
    </div>
  );
}
