import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { CrystalButton, CrystalReadout } from '../../components/CrystalUI';
import {
  playErrorSound,
  playMoveSound,
  playScoreSound,
} from '../../utils/soundEffects';

interface Pt {
  x: number;
  y: number;
}

const GRID = 15;

function spawnFood(occupiedPts: Pt[]): Pt {
  const occupied = new Set(occupiedPts.map((p) => `${p.x},${p.y}`));
  const free: Pt[] = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  return free[Math.floor(Math.random() * free.length)] || { x: 2, y: 2 };
}

export function SnakeBoard({
  isGameOver,
  disabled,
  onMove,
}: GameRendererProps) {
  const [snake, setSnake] = useState<Pt[]>([
    { x: 7, y: 7 },
    { x: 6, y: 7 },
    { x: 5, y: 7 },
  ]);
  const [food, setFood] = useState<Pt>(() => ({ x: 11, y: 7 }));
  const [bonusFood, setBonusFood] = useState<{ pt: Pt; ticksLeft: number } | null>(null);
  const [score, setScore] = useState(0);
  const [applesEaten, setApplesEaten] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [turboMode, setTurboMode] = useState(false);

  const dirRef = useRef<Pt>({ x: 1, y: 0 });
  const dirQueueRef = useRef<Pt[]>([]);
  const scoreRef = useRef(0);
  const applesRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const endedRef = useRef(false);

  const enqueueDir = useCallback(
    (next: Pt) => {
      if (endedRef.current || isGameOver || disabled) return;
      if (!started) setStarted(true);
      if (paused) setPaused(false);

      const queue = dirQueueRef.current;
      const lastScheduled = queue.length > 0 ? queue[queue.length - 1] : dirRef.current;

      // Verhindere 180-Grad-Kehrtwende und identische Doppel-Richtung
      if (lastScheduled.x + next.x === 0 && lastScheduled.y + next.y === 0) return;
      if (lastScheduled.x === next.x && lastScheduled.y === next.y) return;

      if (queue.length < 2) {
        queue.push(next);
        playMoveSound();
      }
    },
    [started, paused, isGameOver, disabled]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        enqueueDir({ x: 0, y: -1 });
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        enqueueDir({ x: 0, y: 1 });
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        enqueueDir({ x: -1, y: 0 });
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        enqueueDir({ x: 1, y: 0 });
      } else if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        if (started && !endedRef.current) {
          e.preventDefault();
          setPaused((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enqueueDir, started]);

  // Dynamische Geschwindigkeit: wird mit wachsender Schlange leicht schneller
  const baseInterval = turboMode ? 105 : 145;
  const tickMs = Math.max(70, baseInterval - Math.min(45, applesEaten * 2));

  useEffect(() => {
    if (!started || paused || isGameOver || disabled || endedRef.current) return;

    const id = setInterval(() => {
      setSnake((prev) => {
        if (dirQueueRef.current.length > 0) {
          dirRef.current = dirQueueRef.current.shift()!;
        }

        const head = prev[0];
        const nextHead = {
          x: head.x + dirRef.current.x,
          y: head.y + dirRef.current.y,
        };
        const hitWall =
          nextHead.x < 0 ||
          nextHead.x >= GRID ||
          nextHead.y < 0 ||
          nextHead.y >= GRID;

        const ateFood = nextHead.x === food.x && nextHead.y === food.y;
        const ateBonus =
          bonusFood !== null &&
          nextHead.x === bonusFood.pt.x &&
          nextHead.y === bonusFood.pt.y;

        const bodyToCheck = ateFood || ateBonus ? prev : prev.slice(0, -1);
        const hitSelf = bodyToCheck.some(
          (p) => p.x === nextHead.x && p.y === nextHead.y
        );

        if (hitWall || hitSelf) {
          if (!endedRef.current) {
            endedRef.current = true;
            playErrorSound();
            const finalScore = scoreRef.current;
            const lengthReached = prev.length;
            setTimeout(() => {
              onMove({
                score: finalScore,
                isAbsolute: true,
                finish: true,
                label: `${finalScore} PKT (LÄNGE ${lengthReached})`,
              });
            }, 0);
          }
          return prev;
        }

        const nextSnake =
          ateFood || ateBonus
            ? [nextHead, ...prev]
            : [nextHead, ...prev.slice(0, -1)];

        if (ateFood) {
          const nextApples = applesRef.current + 1;
          applesRef.current = nextApples;
          setApplesEaten(nextApples);

          const gained = turboMode ? 15 : 10;
          const nextScore = scoreRef.current + gained;
          scoreRef.current = nextScore;
          setScore(nextScore);
          playScoreSound(1);

          const nextFood = spawnFood(
            bonusFood ? [...nextSnake, bonusFood.pt] : nextSnake
          );
          setFood(nextFood);

          // Alle 4 Äpfel erscheint eine goldene Bonus-Frucht (+30 Pkt)
          if (nextApples % 4 === 0 && !bonusFood) {
            const bPt = spawnFood([...nextSnake, nextFood]);
            setBonusFood({ pt: bPt, ticksLeft: 38 });
          }

          setTimeout(() => onMove({ score: nextScore, isAbsolute: true }), 0);
        } else if (ateBonus) {
          const nextScore = scoreRef.current + 30;
          scoreRef.current = nextScore;
          setScore(nextScore);
          setBonusFood(null);
          playScoreSound(3);
          setTimeout(() => onMove({ score: nextScore, isAbsolute: true }), 0);
        } else if (bonusFood) {
          setBonusFood((b) =>
            b && b.ticksLeft > 1 ? { ...b, ticksLeft: b.ticksLeft - 1 } : null
          );
        }

        return nextSnake;
      });
    }, tickMs);

    return () => clearInterval(id);
  }, [started, paused, tickMs, turboMode, food, bonusFood, isGameOver, disabled, onMove]);

  const snakeSet = new Set(snake.map((p) => `${p.x},${p.y}`));

  return (
    <div className="flex h-full w-full max-w-6xl flex-1 min-h-0 flex-col lg:flex-row landscape:flex-row items-center justify-center gap-2.5 sm:gap-5 px-1 sm:px-3 select-none">
      {/* Obere kompakte Statusleiste im Hochformat */}
      <div className="flex lg:hidden landscape:hidden items-center justify-between w-full max-w-[min(92vw,33rem)] px-3 py-1.5 bg-[#F8FAFC] border-[3px] border-[#334155] shadow-[0_4px_0_rgba(15,23,42,0.28)] text-xs sm:text-sm font-arcade uppercase text-[#1E293B] shrink-0">
        <div className="flex items-center gap-3">
          <span>
            SCORE: <strong className="text-[#059669]">{score}</strong>
          </span>
          <span>
            LÄNGE: <strong className="text-[#1E293B]">{snake.length}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTurboMode((t) => !t)}
            className={`px-2 py-0.5 text-[11px] border-2 cursor-pointer ${
              turboMode
                ? 'bg-[#EA580C] text-white border-[#78350F]'
                : 'bg-[#E2E8F0] text-[#334155] border-[#64748B]'
            }`}
          >
            {turboMode ? 'TURBO ⚡' : 'NORMAL'}
          </button>
          {started && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="px-2 py-0.5 text-[11px] bg-[#1E293B] text-white border-2 border-[#0F172A] cursor-pointer"
            >
              {paused ? 'WEITER' : 'PAUSE'}
            </button>
          )}
        </div>
      </div>

      {/* GROSSFLÄCHIGE 15×15 SLATE-ARENA */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        <div
          onTouchStart={(e) => {
            touchStartRef.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
            };
          }}
          onTouchEnd={(e) => {
            if (!touchStartRef.current) return;
            const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
            const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
            touchStartRef.current = null;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
            if (Math.abs(dx) > Math.abs(dy)) {
              enqueueDir(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
            } else {
              enqueueDir(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
            }
          }}
          className="relative grid gap-[2px] p-2 sm:p-3 bg-[#0F172A] border-[4px] border-[#064E3B] shadow-[inset_0_0_0_3px_#10B981,0_12px_28px_rgba(15,23,42,0.5)] w-[min(92vw,calc(100dvh-11.5rem),34rem)] landscape:w-[min(58vw,calc(100dvh-3.5rem),30rem)] aspect-square touch-none"
          style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: GRID * GRID }).map((_, idx) => {
            const x = idx % GRID;
            const y = Math.floor(idx / GRID);
            const isHead = snake[0].x === x && snake[0].y === y;
            const isBody = !isHead && snakeSet.has(`${x},${y}`);
            const isApple = food.x === x && food.y === y;
            const isBonus =
              bonusFood !== null &&
              bonusFood.pt.x === x &&
              bonusFood.pt.y === y;

            return (
              <div
                key={idx}
                className={`relative flex items-center justify-center transition-colors ${
                  isHead
                    ? 'bg-[#34D399] border border-white shadow-[0_0_8px_#34D399] z-10'
                    : isBody
                      ? 'bg-[#059669] border border-[#6EE7B7]/80'
                      : isBonus
                        ? 'bg-[#F59E0B] border border-[#FEF3C7] shadow-[0_0_10px_#FBBF24] animate-pulse rounded-xs'
                        : isApple
                          ? 'bg-[#E11D48] border border-[#FDA4AF] shadow-[0_0_8px_#FB7185] scale-95 rounded-xs'
                          : 'bg-[#1E293B]/90'
                }`}
              >
                {isHead && (
                  <div className="h-1.5 w-1.5 rounded-full bg-[#064E3B]" />
                )}
              </div>
            );
          })}

          {/* Start- oder Pausen-Overlay direkt auf dem Spielfeld */}
          {(!started || paused) && (
            <div
              onClick={() => {
                if (!started) setStarted(true);
                if (paused) setPaused(false);
              }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#0F172A]/75 backdrop-blur-[2px] cursor-pointer text-center p-4"
            >
              <span className="font-arcade text-xl sm:text-2xl text-[#34D399] uppercase tracking-wider drop-shadow-[0_2px_0_#064E3B]">
                {paused ? 'SPIEL PAUSIERT' : 'TIPPEN ODER RICHTUNG WÄHLEN'}
              </span>
              <span className="font-arcade text-xs text-[#F8FAFC] uppercase">
                WISCHEN • PFEILTASTEN • WASD • STEURKREUZ
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Steuerkreuz & Statistik-Spalte */}
      <aside className="flex flex-col items-center justify-center gap-2.5 sm:gap-3.5 w-full lg:w-60 landscape:w-52 shrink-0">
        <div className="hidden lg:flex landscape:flex flex-col gap-2 w-full bg-[#F8FAFC] border-[3px] border-[#334155] shadow-[inset_0_0_0_3px_#FFFFFF,0_6px_0_rgba(15,23,42,0.3)] p-3 text-center">
          <CrystalReadout variant="emerald" label="PUNKTE" value={score} />
          <CrystalReadout label="SCHLANGENLÄNGE" value={snake.length} />

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <CrystalButton
              size="sm"
              variant={turboMode ? 'amber' : 'secondary'}
              onClick={() => setTurboMode((t) => !t)}
            >
              {turboMode ? 'TURBO ⚡' : 'NORMAL'}
            </CrystalButton>
            <CrystalButton
              size="sm"
              variant="secondary"
              disabled={!started}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              <span>{paused ? 'GO' : 'PAUSE'}</span>
            </CrystalButton>
          </div>
        </div>

        {/* Ergonomisches D-Pad */}
        <div className="flex items-center justify-center gap-2 lg:grid lg:grid-cols-3 landscape:grid landscape:grid-cols-3 lg:gap-2 landscape:gap-1.5 mx-auto">
          <button
            type="button"
            aria-label="Hoch"
            onClick={() => enqueueDir({ x: 0, y: -1 })}
            className="grid h-11 w-13 sm:h-12 sm:w-14 lg:h-12 lg:w-12 landscape:h-11 landscape:w-11 place-items-center bg-[#F8FAFC] hover:bg-[#FFFFFF] text-[#1E293B] border-[3px] border-[#334155] shadow-[inset_0_0_0_2px_#FFFFFF,0_4px_0_rgba(15,23,42,0.3)] active:scale-90 cursor-pointer lg:col-start-2 lg:row-start-1 landscape:col-start-2 landscape:row-start-1"
          >
            <ArrowUp className="h-5 w-5 stroke-[3]" />
          </button>
          <button
            type="button"
            aria-label="Links"
            onClick={() => enqueueDir({ x: -1, y: 0 })}
            className="grid h-11 w-13 sm:h-12 sm:w-14 lg:h-12 lg:w-12 landscape:h-11 landscape:w-11 place-items-center bg-[#F8FAFC] hover:bg-[#FFFFFF] text-[#1E293B] border-[3px] border-[#334155] shadow-[inset_0_0_0_2px_#FFFFFF,0_4px_0_rgba(15,23,42,0.3)] active:scale-90 cursor-pointer lg:col-start-1 lg:row-start-2 landscape:col-start-1 landscape:row-start-2"
          >
            <ArrowLeft className="h-5 w-5 stroke-[3]" />
          </button>
          <button
            type="button"
            aria-label="Runter"
            onClick={() => enqueueDir({ x: 0, y: 1 })}
            className="grid h-11 w-13 sm:h-12 sm:w-14 lg:h-12 lg:w-12 landscape:h-11 landscape:w-11 place-items-center bg-[#F8FAFC] hover:bg-[#FFFFFF] text-[#1E293B] border-[3px] border-[#334155] shadow-[inset_0_0_0_2px_#FFFFFF,0_4px_0_rgba(15,23,42,0.3)] active:scale-90 cursor-pointer lg:col-start-2 lg:row-start-2 landscape:col-start-2 landscape:row-start-2"
          >
            <ArrowDown className="h-5 w-5 stroke-[3]" />
          </button>
          <button
            type="button"
            aria-label="Rechts"
            onClick={() => enqueueDir({ x: 1, y: 0 })}
            className="grid h-11 w-13 sm:h-12 sm:w-14 lg:h-12 lg:w-12 landscape:h-11 landscape:w-11 place-items-center bg-[#F8FAFC] hover:bg-[#FFFFFF] text-[#1E293B] border-[3px] border-[#334155] shadow-[inset_0_0_0_2px_#FFFFFF,0_4px_0_rgba(15,23,42,0.3)] active:scale-90 cursor-pointer lg:col-start-3 lg:row-start-2 landscape:col-start-3 landscape:row-start-2"
          >
            <ArrowRight className="h-5 w-5 stroke-[3]" />
          </button>
        </div>
      </aside>
    </div>
  );
}
