import { useEffect, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { CrystalReadout } from '../../components/CrystalUI';

type Phase = 'idle' | 'waiting' | 'ready' | 'early' | 'done';

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
      <div className="flex landscape:hidden items-center gap-2 text-xs font-arcade uppercase text-white drop-shadow-[0_1.5px_0_#0F172A]">
        <span>VERSUCH {Math.min(attempts.length + (phase === 'done' ? 0 : 1), TOTAL_ROUNDS)} / {TOTAL_ROUNDS}</span>
        {lastMs !== null && (
          <span className="bg-[#059669] border-2 border-[#064E3B] px-2.5 py-0.5 text-[11px] font-arcade text-white shadow-[0_2px_0_rgba(15,23,42,0.3)]">
            LETZTE: {lastMs} MS
          </span>
        )}
      </div>

      {/* Haupt-Tippanzeige mit klaren Ampel-Phasenfarben (Smaragd = JETZT, Bernstein = WARTEN, Rubin = ZU FRÜH, Perle = START) */}
      <button
        type="button"
        onPointerDown={handleTap}
        className={`relative w-full h-56 sm:h-64 landscape:h-[min(calc(100dvh-5.5rem),16.5rem)] flex flex-col items-center justify-center gap-2.5 p-6 text-center transition-all active:scale-[0.98] cursor-pointer border-[4px] overflow-hidden ${
          phase === 'ready'
            ? 'bg-[#059669] text-white border-[#064E3B] shadow-[inset_0_0_0_4px_#6EE7B7,0_10px_0_rgba(6,78,59,0.45)]'
            : phase === 'waiting'
            ? 'bg-[#D97706] text-white border-[#78350F] shadow-[inset_0_0_0_4px_#FCD34D,0_10px_0_rgba(120,53,15,0.45)]'
            : phase === 'early'
            ? 'bg-[#E11D48] text-white border-[#881337] shadow-[inset_0_0_0_4px_#FDA4AF,0_10px_0_rgba(136,19,55,0.45)]'
            : 'bg-[#F8FAFC] text-[#1E293B] border-[#334155] shadow-[inset_0_0_0_4px_#E2E8F0,0_10px_0_rgba(15,23,42,0.4)]'
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-white/18"
          style={{ clipPath: 'polygon(0 0, 56% 0, 32% 100%, 0 100%)' }}
        />
        <Zap className={`relative z-10 h-11 w-11 landscape:h-9 landscape:w-9 ${phase === 'ready' ? 'fill-current animate-bounce text-[#FEF3C7]' : phase === 'idle' ? 'text-[#059669]' : ''}`} />
        <span className="relative z-10 text-xl sm:text-2xl landscape:text-xl font-arcade uppercase tracking-wide">
          {phase === 'idle' && (attempts.length === 0 ? 'TIPPEN ZUM STARTEN' : 'NÄCHSTER VERSUCH')}
          {phase === 'waiting' && 'WARTE AUF GRÜN…'}
          {phase === 'ready' && 'JETZT TIPPEN!'}
          {phase === 'early' && 'ZU FRÜH! NOCHMAL'}
          {phase === 'done' && 'FERTIG!'}
        </span>
      </button>

      {/* Rechte Infospalte im Querformat & Chipzeile im Hochformat */}
      <div className="flex flex-col items-center landscape:items-stretch gap-2.5 w-full">
        <div className="hidden landscape:flex flex-col items-center bg-[#F8FAFC] border-[3px] border-[#334155] shadow-[inset_0_0_0_3px_#FFFFFF,0_6px_0_rgba(15,23,42,0.3)] px-3 py-3 text-center gap-2">
          <CrystalReadout
            label="RUNDE"
            value={`${Math.min(attempts.length + (phase === 'done' ? 0 : 1), TOTAL_ROUNDS)}/${TOTAL_ROUNDS}`}
          />
          {lastMs !== null && <CrystalReadout variant="emerald" label="LETZTE" value={`${lastMs} MS`} />}
        </div>

        {attempts.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {attempts.map((ms, i) => (
              <span
                key={i}
                className="bg-[#1E293B] border-2 border-[#0F172A] px-2.5 py-0.5 text-[11px] font-arcade text-[#6EE7B7] shadow-[0_2px_0_rgba(15,23,42,0.3)]"
              >
                #{i + 1}: {ms} MS
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
