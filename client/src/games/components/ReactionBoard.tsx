import { useEffect, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { getGameTheme } from '../../styles/uiTokens';

type Phase = 'idle' | 'waiting' | 'ready' | 'early' | 'done';

export function ReactionBoard({
  gameId = 'reaction',
  isGameOver,
  disabled,
  onMove,
}: GameRendererProps) {
  const theme = getGameTheme(gameId);
  const [phase, setPhase] = useState<Phase>('idle');
  const [attempts, setAttempts] = useState<number[]>([]);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const TOTAL_ROUNDS = 3;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const startWaiting = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase('waiting');
    const delay = 1300 + Math.floor(Math.random() * 2400);
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
      setPhase('early');
      return;
    }

    if (phase === 'ready') {
      const elapsed = Math.max(50, Math.round(performance.now() - startTimeRef.current));
      const nextAttempts = [...attempts, elapsed];
      setAttempts(nextAttempts);
      setLastMs(elapsed);

      if (nextAttempts.length >= TOTAL_ROUNDS) {
        const avg = Math.round(nextAttempts.reduce((a, b) => a + b, 0) / nextAttempts.length);
        setPhase('done');
        onMove({
          score: avg,
          isAbsolute: true,
          finish: true,
          label: `${avg} ms (Ø ${TOTAL_ROUNDS} Runden)`,
          lowerIsBetter: true,
        });
      } else {
        setPhase('idle');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-sm landscape:max-w-xl landscape:grid landscape:grid-cols-[1.35fr_0.85fr] landscape:items-center landscape:gap-5 gap-3 select-none">
      {/* Hochformat Rundenfortschritt */}
      <div className="flex landscape:hidden items-center gap-2 text-xs font-bold text-[#AEAEB2]">
        <span>Versuch {Math.min(attempts.length + (phase === 'done' ? 0 : 1), TOTAL_ROUNDS)} / {TOTAL_ROUNDS}</span>
        {lastMs !== null && (
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${theme.badgePill}`}>
            Letzte: {lastMs} ms
          </span>
        )}
      </div>

      {/* Haupt-Tippanzeige */}
      <button
        type="button"
        onPointerDown={handleTap}
        className={`w-full h-56 sm:h-64 landscape:h-[min(calc(100dvh-5.5rem),16.5rem)] rounded-3xl flex flex-col items-center justify-center gap-2.5 p-6 text-center transition-all active:scale-[0.98] cursor-pointer shadow-2xl ${
          phase === 'ready'
            ? 'bg-emerald-500 text-[#0B0B0F] ring-4 ring-emerald-300 shadow-emerald-500/40'
            : phase === 'waiting'
            ? 'bg-rose-500/20 text-rose-200 ring-2 ring-rose-500/45'
            : phase === 'early'
            ? 'bg-amber-500/20 text-amber-200 ring-2 ring-amber-400/50'
            : `bg-[#161620]/90 text-white ring-2 ring-white/15 ${theme.hoverRing}`
        }`}
      >
        <Zap className={`h-10 w-10 landscape:h-9 landscape:w-9 ${phase === 'ready' ? 'fill-current animate-bounce' : theme.accentIcon}`} />
        <span className="text-xl sm:text-2xl landscape:text-xl font-black tracking-tight">
          {phase === 'idle' && (attempts.length === 0 ? 'Tippen zum Starten' : 'Nächster Versuch')}
          {phase === 'waiting' && 'Warte auf Grün…'}
          {phase === 'ready' && 'JETZT TIPPEN!'}
          {phase === 'early' && 'Zu früh! Nochmal tippen'}
          {phase === 'done' && 'Fertig!'}
        </span>
      </button>

      {/* Rechte Infospalte im Querformat & Chipzeile im Hochformat */}
      <div className="flex flex-col items-center landscape:items-stretch gap-2.5 w-full">
        <div className="hidden landscape:flex flex-col items-center rounded-2xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/10 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">Runde</span>
          <strong className="text-xl font-black text-white tabular-nums">
            {Math.min(attempts.length + (phase === 'done' ? 0 : 1), TOTAL_ROUNDS)} / {TOTAL_ROUNDS}
          </strong>
          {lastMs !== null && (
            <span className={`mt-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black ${theme.badgePill}`}>
              Letzte: {lastMs} ms
            </span>
          )}
        </div>

        {attempts.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {attempts.map((ms, i) => (
              <span
                key={i}
                className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-mono font-bold text-white/80 ring-1 ring-white/10"
              >
                #{i + 1}: {ms} ms
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
