import { useEffect, useRef, useState } from 'react';
import { Rocket } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { getGameTheme } from '../../styles/uiTokens';

interface Obstacle {
  id: number;
  x: number; // 0..100 %
  y: number; // 0..100 %
  isCore: boolean;
}

export function SpaceDodgeBoard({
  gameId = 'space-dodge',
  isGameOver,
  disabled,
  onMove,
}: GameRendererProps) {
  const theme = getGameTheme(gameId);
  const [shipX, setShipX] = useState(50);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const shipXRef = useRef(50);
  const scoreRef = useRef(0);
  const nextIdRef = useRef(1);
  const endedRef = useRef(false);

  useEffect(() => {
    if (!started || isGameOver || disabled || endedRef.current) return;

    const id = setInterval(() => {
      let crashed = false;
      let bonus = 0;

      setObstacles((prev) => {
        const moved = prev
          .map((o) => ({ ...o, y: o.y + (o.isCore ? 4.2 : 4.8) }))
          .filter((o) => {
            const hitY = o.y >= 78 && o.y <= 92;
            const hitX = Math.abs(o.x - shipXRef.current) < 11;
            if (hitY && hitX) {
              if (o.isCore) {
                bonus += 25;
                return false;
              } else {
                crashed = true;
                return false;
              }
            }
            return o.y <= 105;
          });

        if (Math.random() < 0.36) {
          moved.push({
            id: nextIdRef.current++,
            x: 10 + Math.random() * 80,
            y: -6,
            isCore: Math.random() < 0.25,
          });
        }
        return moved;
      });

      if (crashed && !endedRef.current) {
        endedRef.current = true;
        const finalScore = scoreRef.current;
        setTimeout(() => {
          onMove({ score: finalScore, isAbsolute: true, finish: true });
        }, 0);
        return;
      }

      scoreRef.current += 2 + bonus;
      setScore(scoreRef.current);
    }, 65);

    return () => clearInterval(id);
  }, [started, isGameOver, disabled, onMove]);

  const updateShipFromClientX = (clientX: number) => {
    if (!stageRef.current || endedRef.current) return;
    setStarted(true);
    const rect = stageRef.current.getBoundingClientRect();
    const pct = Math.max(8, Math.min(92, ((clientX - rect.left) / rect.width) * 100));
    shipXRef.current = pct;
    setShipX(pct);
  };

  const nudgeShip = (delta: number) => {
    if (endedRef.current) return;
    setStarted(true);
    const next = Math.max(8, Math.min(92, shipXRef.current + delta));
    shipXRef.current = next;
    setShipX(next);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[18.5rem] sm:max-w-xs landscape:max-w-xl landscape:grid landscape:grid-cols-[1fr_11.5rem] landscape:items-center landscape:justify-center landscape:gap-5 gap-2 select-none">
      {/* Hochformat Info-Zeile */}
      <div className="flex landscape:hidden items-center justify-between w-full px-1 text-xs font-bold text-[#AEAEB2]">
        <span>Punkte: <strong className={theme.accentText}>{score}</strong></span>
        {!started && <span className="text-[11px] text-white/60">Feld ziehen zum Starten</span>}
      </div>

      {/* Weltraum-Arena */}
      <div
        ref={stageRef}
        onPointerDown={(e) => updateShipFromClientX(e.clientX)}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType === 'touch') updateShipFromClientX(e.clientX);
        }}
        className={`relative w-full h-72 sm:h-80 landscape:h-[min(calc(100dvh-5.2rem),21rem)] landscape:max-w-[20rem] landscape:mx-auto rounded-3xl bg-[#0D1322]/95 ${theme.softRing} overflow-hidden touch-none cursor-ew-resize`}
      >
        {obstacles.map((o) => (
          <div
            key={o.id}
            style={{ left: `${o.x}%`, top: `${o.y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${
              o.isCore
                ? 'h-4 w-4 bg-amber-300 shadow-[0_0_12px_#fcd34d]'
                : 'h-6 w-6 bg-slate-400/90 ring-2 ring-slate-200/30 shadow-md'
            }`}
          />
        ))}

        {/* Raumschiff */}
        <div
          style={{ left: `${shipX}%`, top: '84%' }}
          className="absolute -translate-x-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-2xl bg-sky-500/25 text-sky-300 ring-1 ring-sky-400/60 shadow-[0_0_18px_rgba(56,189,248,0.45)]"
        >
          <Rocket className="h-5 w-5 -rotate-45" />
        </div>
      </div>

      {/* Rechte Seitenleiste im Querformat */}
      <div className="hidden landscape:flex flex-col gap-3 w-full">
        <div className="flex flex-col items-center rounded-2xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/10 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">Punkte</span>
          <strong className={`text-2xl font-black tabular-nums ${theme.accentText}`}>{score}</strong>
          {!started && (
            <span className="mt-1 text-[10px] text-white/55">Ziehen oder steuern</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-label="Nach links steuern"
            onClick={() => nudgeShip(-14)}
            className="h-11 rounded-xl bg-white/[0.08] hover:bg-white/15 active:scale-90 text-sm font-black ring-1 ring-white/10 cursor-pointer"
          >
            ◀
          </button>
          <button
            type="button"
            aria-label="Nach rechts steuern"
            onClick={() => nudgeShip(14)}
            className="h-11 rounded-xl bg-white/[0.08] hover:bg-white/15 active:scale-90 text-sm font-black ring-1 ring-white/10 cursor-pointer"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
