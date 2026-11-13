import { useEffect, useRef, useState } from 'react';
import { Rocket } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { CrystalButton, CrystalReadout, CrystalStar } from '../../components/CrystalUI';

interface Obstacle {
  id: number;
  x: number; // 0..100 %
  y: number; // 0..100 %
  isCore: boolean;
}

export function SpaceDodgeBoard({
  isGameOver,
  disabled,
  onMove,
}: GameRendererProps) {
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
      <div className="flex landscape:hidden items-center justify-between w-full px-2 py-1.5 bg-[#9CE0FA] border-2 border-[#17608E] text-xs font-arcade uppercase text-[#15608E]">
        <span>SCORE: <strong className="text-[#0E486C]">{score}</strong></span>
        {!started && <span className="text-[10px] text-[#17608E]">DRAG TO START</span>}
      </div>

      {/* Kristall-Arena */}
      <div
        ref={stageRef}
        onPointerDown={(e) => updateShipFromClientX(e.clientX)}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType === 'touch') updateShipFromClientX(e.clientX);
        }}
        className="relative w-full h-72 sm:h-80 landscape:h-[min(calc(100dvh-5.2rem),21rem)] landscape:max-w-[20rem] landscape:mx-auto bg-[#2B82B8] border-[4px] border-[#17608E] shadow-[inset_0_0_0_4px_#66C4EE,0_8px_0_rgba(14,62,96,0.38)] overflow-hidden touch-none cursor-ew-resize"
      >
        {/* Diagonal crystal sheen */}
        <div
          className="pointer-events-none absolute inset-0 bg-[#52A9D6]/40"
          style={{ clipPath: 'polygon(0 0, 58% 0, 32% 100%, 0 100%)' }}
        />

        {obstacles.map((o) => (
          <div
            key={o.id}
            style={{ left: `${o.x}%`, top: `${o.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
          >
            {o.isCore ? (
              <CrystalStar size={22} active />
            ) : (
              <div
                className="h-6 w-6 bg-[#17608E] border-2 border-[#9CE0FA] shadow-md"
                style={{ clipPath: 'polygon(15% 0%, 88% 8%, 100% 75%, 72% 100%, 0% 82%)' }}
              />
            )}
          </div>
        ))}

        {/* Raumschiff im Crystal-Look */}
        <div
          style={{ left: `${shipX}%`, top: '84%' }}
          className="absolute -translate-x-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center bg-[#9CE0FA] text-[#15608E] border-[3px] border-[#17608E] shadow-[inset_0_0_0_2px_#DDF6FF,0_4px_0_rgba(14,62,96,0.45)]"
        >
          <Rocket className="h-5 w-5 -rotate-45" />
        </div>
      </div>

      {/* Rechte Seitenleiste im Querformat */}
      <div className="hidden landscape:flex flex-col gap-3 w-full">
        <div className="flex flex-col items-center bg-[#9CE0FA] border-[3px] border-[#17608E] shadow-[inset_0_0_0_3px_#66C4EE] px-3 py-2.5 text-center">
          <CrystalReadout label="SCORE" value={score} />
          {!started && (
            <span className="mt-1.5 text-[10px] font-arcade uppercase text-[#15608E]">DRAG OR STEER</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <CrystalButton size="sm" onClick={() => nudgeShip(-14)}>
            ◀
          </CrystalButton>
          <CrystalButton size="sm" onClick={() => nudgeShip(14)}>
            ▶
          </CrystalButton>
        </div>
      </div>
    </div>
  );
}
