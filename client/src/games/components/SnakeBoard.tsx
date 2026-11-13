import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play, Sparkles, Zap } from 'lucide-react';
import type { GameRendererProps } from '../types';
import {
  playErrorSound,
  playMoveSound,
  playScoreSound,
  triggerHapticFeedback,
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

      if (lastScheduled.x + next.x === 0 && lastScheduled.y + next.y === 0) return;
      if (lastScheduled.x === next.x && lastScheduled.y === next.y) return;

      if (queue.length < 2) {
        queue.push(next);
        playMoveSound();
        triggerHapticFeedback(8);
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
            triggerHapticFeedback([30, 40]);
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
          triggerHapticFeedback(14);

          const nextFood = spawnFood(
            bonusFood ? [...nextSnake, bonusFood.pt] : nextSnake
          );
          setFood(nextFood);

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
          triggerHapticFeedback([15, 25]);
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

  const snakeIndexMap = new Map<string, number>();
  snake.forEach((p, i) => {
    const key = `${p.x},${p.y}`;
    if (!snakeIndexMap.has(key)) snakeIndexMap.set(key, i);
  });

  return (
    <div className="flex h-full w-full max-w-5xl flex-1 min-h-0 flex-col items-center justify-center gap-2 sm:gap-3 px-1 sm:px-3 select-none">
      {/* INTEGRIERTE BIO-GRID HUD-LEISTE */}
      <div className="flex flex-wrap items-center justify-between gap-2 w-full max-w-[min(94vw,35rem)] landscape:max-w-[min(86vw,44rem)] px-3 sm:px-4 py-1.5 sm:py-2 bg-[#06241B]/95 border-[3px] border-[#10B981] shadow-[0_8px_20px_rgba(0,0,0,0.5)] text-xs sm:text-sm font-arcade uppercase text-[#D1FAE5] shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <span>
            SCORE: <strong className="text-[#34D399]">{score}</strong>
          </span>
          <span>
            LÄNGE: <strong className="text-white">{snake.length}</strong>
          </span>
          {bonusFood && (
            <span className="inline-flex items-center gap-1 bg-[#78350F] text-[#FDE68A] border border-[#FBBF24] px-2 py-0.5 text-[10px] animate-pulse">
              <Sparkles className="h-3 w-3" /> BONUS +30 ({bonusFood.ticksLeft})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTurboMode((t) => !t)}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-arcade uppercase border-2 transition-all cursor-pointer active:scale-95 ${
              turboMode
                ? 'bg-[#D97706] text-white border-[#FDE68A] shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                : 'bg-[#041510] text-[#6EE7B7] border-[#059669]'
            }`}
          >
            <Zap className="h-3 w-3" />
            <span>{turboMode ? 'TURBO' : 'NORMAL'}</span>
          </button>
          {started && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-arcade uppercase bg-[#041510] text-white border-2 border-[#34D399] cursor-pointer active:scale-95"
            >
              {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              <span>{paused ? 'WEITER' : 'PAUSE'}</span>
            </button>
          )}
        </div>
      </div>

      {/* HAUPTBEREICH: 15×15 BIO-GRID ARENA + ERGONOMISCHES TOUCH-STEUERKREUZ */}
      <div className="flex flex-1 min-h-0 w-full flex-col lg:flex-row landscape:flex-row items-center justify-center gap-2.5 sm:gap-5">
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
          className="relative grid p-1.5 sm:p-2.5 bg-[#04120D] border-[4px] border-[#10B981] shadow-[inset_0_0_24px_rgba(16,185,129,0.22),0_16px_36px_rgba(0,0,0,0.65)] w-[min(92vw,calc(100dvh-11.5rem),35rem)] landscape:w-[min(58vw,calc(100dvh-5.5rem),29rem)] aspect-square touch-none"
          style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: GRID * GRID }).map((_, idx) => {
            const x = idx % GRID;
            const y = Math.floor(idx / GRID);
            const segIdx = snakeIndexMap.get(`${x},${y}`);
            const isHead = segIdx === 0;
            const isBody = segIdx !== undefined && segIdx > 0;
            const isTail = segIdx === snake.length - 1;
            const isApple = food.x === x && food.y === y;
            const isBonus =
              bonusFood !== null &&
              bonusFood.pt.x === x &&
              bonusFood.pt.y === y;
            const isCheckerEven = (x + y) % 2 === 0;

            return (
              <div
                key={idx}
                className={`relative flex items-center justify-center ${
                  isCheckerEven ? 'bg-[#081C15]' : 'bg-[#0B241B]'
                }`}
              >
                {isHead && (
                  <div className="h-[92%] w-[92%] rounded-sm bg-gradient-to-br from-[#6EE7B7] to-[#10B981] border border-white shadow-[0_0_10px_#34D399] flex items-center justify-center gap-0.5 z-10">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#022C22]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#022C22]" />
                  </div>
                )}

                {isBody && (
                  <div
                    className={`${
                      isTail ? 'h-[72%] w-[72%]' : 'h-[86%] w-[86%]'
                    } rounded-xs bg-gradient-to-br from-[#34D399] to-[#059669] border border-[#A7F3D0]/60`}
                  />
                )}

                {isApple && (
                  <div className="h-[82%] w-[82%] rounded-full bg-gradient-to-br from-[#FDA4AF] via-[#E11D48] to-[#9F1239] border border-white shadow-[0_0_12px_#F43F5E] animate-pulse" />
                )}

                {isBonus && (
                  <div className="h-[88%] w-[88%] rounded-full bg-gradient-to-br from-[#FEF08A] via-[#F59E0B] to-[#B45309] border border-white shadow-[0_0_14px_#FBBF24] animate-bounce" />
                )}
              </div>
            );
          })}

          {/* Start- oder Pausen-Overlay */}
          {(!started || paused) && (
            <div
              onClick={() => {
                if (!started) setStarted(true);
                if (paused) setPaused(false);
              }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#04120D]/80 backdrop-blur-[2px] cursor-pointer text-center p-4"
            >
              <span className="font-arcade text-xl sm:text-3xl text-[#34D399] uppercase tracking-wider drop-shadow-[0_2px_0_#022C22]">
                {paused ? 'BIO-GRID PAUSIERT' : 'TIPPEN ODER RICHTUNG WÄHLEN'}
              </span>
              <span className="font-arcade text-xs text-[#A7F3D0] uppercase">
                WISCHEN • PFEILTASTEN • WASD • D-PAD
              </span>
            </div>
          )}
        </div>

        {/* Kompaktes Cyber-Steuerkreuz (unten im Hochformat, rechts im Querformat/Desktop) */}
        <div className="flex items-center justify-center gap-2 lg:grid lg:grid-cols-3 landscape:grid landscape:grid-cols-3 lg:gap-2 landscape:gap-1.5 shrink-0">
          <div className="hidden lg:block landscape:block" />
          <button
            type="button"
            aria-label="Hoch"
            onClick={() => enqueueDir({ x: 0, y: -1 })}
            className="grid h-11 w-13 sm:h-12 sm:w-14 lg:h-13 lg:w-13 landscape:h-11 landscape:w-11 place-items-center bg-[#064E3B]/90 hover:bg-[#047857] text-[#ECFDF5] border-[3px] border-[#34D399] shadow-[0_4px_0_rgba(0,0,0,0.45)] active:scale-90 cursor-pointer lg:col-start-2 lg:row-start-1 landscape:col-start-2 landscape:row-start-1"
          >
            <ArrowUp className="h-5 w-5 stroke-[3]" />
          </button>
          <button
            type="button"
            aria-label="Links"
            onClick={() => enqueueDir({ x: -1, y: 0 })}
            className="grid h-11 w-13 sm:h-12 sm:w-14 lg:h-13 lg:w-13 landscape:h-11 landscape:w-11 place-items-center bg-[#064E3B]/90 hover:bg-[#047857] text-[#ECFDF5] border-[3px] border-[#34D399] shadow-[0_4px_0_rgba(0,0,0,0.45)] active:scale-90 cursor-pointer lg:col-start-1 lg:row-start-2 landscape:col-start-1 landscape:row-start-2"
          >
            <ArrowLeft className="h-5 w-5 stroke-[3]" />
          </button>
          <button
            type="button"
            aria-label="Runter"
            onClick={() => enqueueDir({ x: 0, y: 1 })}
            className="grid h-11 w-13 sm:h-12 sm:w-14 lg:h-13 lg:w-13 landscape:h-11 landscape:w-11 place-items-center bg-[#064E3B]/90 hover:bg-[#047857] text-[#ECFDF5] border-[3px] border-[#34D399] shadow-[0_4px_0_rgba(0,0,0,0.45)] active:scale-90 cursor-pointer lg:col-start-2 lg:row-start-2 landscape:col-start-2 landscape:row-start-2"
          >
            <ArrowDown className="h-5 w-5 stroke-[3]" />
          </button>
          <button
            type="button"
            aria-label="Rechts"
            onClick={() => enqueueDir({ x: 1, y: 0 })}
            className="grid h-11 w-13 sm:h-12 sm:w-14 lg:h-13 lg:w-13 landscape:h-11 landscape:w-11 place-items-center bg-[#064E3B]/90 hover:bg-[#047857] text-[#ECFDF5] border-[3px] border-[#34D399] shadow-[0_4px_0_rgba(0,0,0,0.45)] active:scale-90 cursor-pointer lg:col-start-3 lg:row-start-2 landscape:col-start-3 landscape:row-start-2"
          >
            <ArrowRight className="h-5 w-5 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
}
