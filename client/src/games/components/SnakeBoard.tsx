import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { getGameTheme } from '../../styles/uiTokens';

interface Pt {
  x: number;
  y: number;
}

const GRID = 13;

function spawnFood(snake: Pt[]): Pt {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  const free: Pt[] = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  return free[Math.floor(Math.random() * free.length)] || { x: 2, y: 2 };
}

export function SnakeBoard({
  gameId = 'snake',
  isGameOver,
  disabled,
  onMove,
}: GameRendererProps) {
  const theme = getGameTheme(gameId);
  const [snake, setSnake] = useState<Pt[]>([
    { x: 6, y: 6 },
    { x: 5, y: 6 },
    { x: 4, y: 6 },
  ]);
  const [food, setFood] = useState<Pt>(() => ({ x: 9, y: 6 }));
  const [started, setStarted] = useState(false);
  const dirRef = useRef<Pt>({ x: 1, y: 0 });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const endedRef = useRef(false);

  const changeDir = useCallback((next: Pt) => {
    setStarted(true);
    const cur = dirRef.current;
    if (cur.x + next.x === 0 && cur.y + next.y === 0) return;
    dirRef.current = next;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); changeDir({ x: 0, y: -1 }); }
      if (e.key === 'ArrowDown') { e.preventDefault(); changeDir({ x: 0, y: 1 }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); changeDir({ x: -1, y: 0 }); }
      if (e.key === 'ArrowRight') { e.preventDefault(); changeDir({ x: 1, y: 0 }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [changeDir]);

  useEffect(() => {
    if (!started || isGameOver || disabled || endedRef.current) return;

    const id = setInterval(() => {
      setSnake((prev) => {
        const head = prev[0];
        const nextHead = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };
        const hitWall =
          nextHead.x < 0 || nextHead.x >= GRID || nextHead.y < 0 || nextHead.y >= GRID;
        const ateFood = nextHead.x === food.x && nextHead.y === food.y;
        const bodyToCheck = ateFood ? prev : prev.slice(0, -1);
        const hitSelf = bodyToCheck.some((p) => p.x === nextHead.x && p.y === nextHead.y);

        if (hitWall || hitSelf) {
          if (!endedRef.current) {
            endedRef.current = true;
            const finalScore = (prev.length - 3) * 10;
            setTimeout(() => {
              onMove({ score: finalScore, isAbsolute: true, finish: true });
            }, 0);
          }
          return prev;
        }

        const nextSnake = ateFood ? [nextHead, ...prev] : [nextHead, ...prev.slice(0, -1)];
        if (ateFood) {
          const nextFood = spawnFood(nextSnake);
          setFood(nextFood);
          const newScore = (nextSnake.length - 3) * 10;
          setTimeout(() => onMove({ score: newScore, isAbsolute: true }), 0);
        }
        return nextSnake;
      });
    }, 155);

    return () => clearInterval(id);
  }, [started, food, isGameOver, disabled, onMove]);

  const currentScore = (snake.length - 3) * 10;
  const snakeSet = new Set(snake.map((p) => `${p.x},${p.y}`));

  return (
    <div className="flex flex-col items-center w-full max-w-[18.5rem] sm:max-w-xs landscape:max-w-xl landscape:grid landscape:grid-cols-[auto_11.5rem] landscape:items-center landscape:justify-center landscape:gap-5 gap-2.5 select-none">
      <div className="flex landscape:hidden items-center justify-between w-full px-1 text-xs font-bold text-[#AEAEB2]">
        <span>Punkte: <strong className={theme.accentText}>{currentScore}</strong></span>
        {!started && (
          <span className="text-[11px] text-white/60">Wischen oder Richtung wählen</span>
        )}
      </div>

      {/* Raster */}
      <div
        onTouchStart={(e) => {
          touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          if (!touchStartRef.current) return;
          const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
          const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
          touchStartRef.current = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
          if (Math.abs(dx) > Math.abs(dy)) {
            changeDir(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
          } else {
            changeDir(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
          }
        }}
        className={`grid gap-0.5 p-2 rounded-3xl bg-[#11151B]/95 ${theme.softRing} w-full landscape:w-[min(46vw,calc(100dvh-5.2rem),21rem)] aspect-square touch-none`}
        style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: GRID * GRID }).map((_, idx) => {
          const x = idx % GRID;
          const y = Math.floor(idx / GRID);
          const isHead = snake[0].x === x && snake[0].y === y;
          const isBody = snakeSet.has(`${x},${y}`);
          const isApple = food.x === x && food.y === y;

          return (
            <div
              key={idx}
              className={`rounded-[4px] transition-colors ${
                isHead
                  ? 'bg-emerald-300 shadow-[0_0_8px_#6ee7b7]'
                  : isBody
                  ? 'bg-emerald-500/85'
                  : isApple
                  ? 'bg-rose-400 rounded-full shadow-[0_0_8px_#fb7185] scale-90'
                  : 'bg-white/[0.03]'
              }`}
            />
          );
        })}
      </div>

      {/* Steuerkreuz (unten im Hochformat, rechts daneben im Querformat) */}
      <div className="flex flex-col items-center landscape:items-stretch gap-3 w-full">
        <div className="hidden landscape:flex flex-col items-center rounded-2xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/10 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">Punkte</span>
          <strong className={`text-2xl font-black tabular-nums ${theme.accentText}`}>{currentScore}</strong>
          {!started && (
            <span className="mt-1 text-[10px] text-white/55">Richtung wählen</span>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 landscape:grid landscape:grid-cols-3 landscape:gap-1.5 landscape:mx-auto">
          <button type="button" aria-label="Hoch" onClick={() => changeDir({ x: 0, y: -1 })} className="grid h-9 w-11 landscape:h-11 landscape:w-11 place-items-center rounded-xl bg-white/[0.08] hover:bg-white/15 active:scale-90 cursor-pointer ring-1 ring-white/10 landscape:col-start-2 landscape:row-start-1">
            <ArrowUp className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Links" onClick={() => changeDir({ x: -1, y: 0 })} className="grid h-9 w-11 landscape:h-11 landscape:w-11 place-items-center rounded-xl bg-white/[0.08] hover:bg-white/15 active:scale-90 cursor-pointer ring-1 ring-white/10 landscape:col-start-1 landscape:row-start-2">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Runter" onClick={() => changeDir({ x: 0, y: 1 })} className="grid h-9 w-11 landscape:h-11 landscape:w-11 place-items-center rounded-xl bg-white/[0.08] hover:bg-white/15 active:scale-90 cursor-pointer ring-1 ring-white/10 landscape:col-start-2 landscape:row-start-2">
            <ArrowDown className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Rechts" onClick={() => changeDir({ x: 1, y: 0 })} className="grid h-9 w-11 landscape:h-11 landscape:w-11 place-items-center rounded-xl bg-white/[0.08] hover:bg-white/15 active:scale-90 cursor-pointer ring-1 ring-white/10 landscape:col-start-3 landscape:row-start-2">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
