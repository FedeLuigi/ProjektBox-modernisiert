import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { CrystalReadout } from '../../components/CrystalUI';

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
  isGameOver,
  disabled,
  onMove,
}: GameRendererProps) {
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
      <div className="flex landscape:hidden items-center justify-between w-full px-2 py-1.5 bg-[#9CE0FA] border-2 border-[#17608E] text-xs font-arcade uppercase text-[#15608E]">
        <span>SCORE: <strong className="text-[#0E486C]">{currentScore}</strong></span>
        {!started && (
          <span className="text-[10px] text-[#17608E]">SWIPE OR TAP</span>
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
        className="grid gap-0.5 p-2 bg-[#52A9D6] border-[4px] border-[#17608E] shadow-[inset_0_0_0_4px_#8AD8F8,0_8px_0_rgba(14,62,96,0.38)] w-full landscape:w-[min(46vw,calc(100dvh-5.2rem),21rem)] aspect-square touch-none"
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
              className={`transition-colors ${
                isHead
                  ? 'bg-[#15608E] border border-white shadow-[0_0_6px_#FFFFFF]'
                  : isBody
                  ? 'bg-[#17689A] border border-[#8AD8F8]'
                  : isApple
                  ? 'bg-[#F6B969] border border-[#C48232] shadow-[0_0_8px_#FDE0A6] scale-95'
                  : 'bg-[#88D6F8]/65'
              }`}
            />
          );
        })}
      </div>

      {/* Steuerkreuz (unten im Hochformat, rechts daneben im Querformat) */}
      <div className="flex flex-col items-center landscape:items-stretch gap-3 w-full">
        <div className="hidden landscape:flex flex-col items-center bg-[#9CE0FA] border-[3px] border-[#17608E] shadow-[inset_0_0_0_3px_#66C4EE] px-3 py-2.5 text-center">
          <CrystalReadout label="SCORE" value={currentScore} />
          {!started && (
            <span className="mt-1.5 text-[10px] font-arcade uppercase text-[#15608E]">CHOOSE DIRECTION</span>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 landscape:grid landscape:grid-cols-3 landscape:gap-1.5 landscape:mx-auto">
          <button type="button" aria-label="Hoch" onClick={() => changeDir({ x: 0, y: -1 })} className="grid h-9 w-11 landscape:h-11 landscape:w-11 place-items-center bg-[#88D6F8] hover:bg-[#9CE0FA] text-[#15608E] border-[3px] border-[#1A6798] shadow-[inset_0_0_0_2px_#B6ECFD] active:scale-90 cursor-pointer landscape:col-start-2 landscape:row-start-1">
            <ArrowUp className="h-4 w-4 stroke-[3]" />
          </button>
          <button type="button" aria-label="Links" onClick={() => changeDir({ x: -1, y: 0 })} className="grid h-9 w-11 landscape:h-11 landscape:w-11 place-items-center bg-[#88D6F8] hover:bg-[#9CE0FA] text-[#15608E] border-[3px] border-[#1A6798] shadow-[inset_0_0_0_2px_#B6ECFD] active:scale-90 cursor-pointer landscape:col-start-1 landscape:row-start-2">
            <ArrowLeft className="h-4 w-4 stroke-[3]" />
          </button>
          <button type="button" aria-label="Runter" onClick={() => changeDir({ x: 0, y: 1 })} className="grid h-9 w-11 landscape:h-11 landscape:w-11 place-items-center bg-[#88D6F8] hover:bg-[#9CE0FA] text-[#15608E] border-[3px] border-[#1A6798] shadow-[inset_0_0_0_2px_#B6ECFD] active:scale-90 cursor-pointer landscape:col-start-2 landscape:row-start-2">
            <ArrowDown className="h-4 w-4 stroke-[3]" />
          </button>
          <button type="button" aria-label="Rechts" onClick={() => changeDir({ x: 1, y: 0 })} className="grid h-9 w-11 landscape:h-11 landscape:w-11 place-items-center bg-[#88D6F8] hover:bg-[#9CE0FA] text-[#15608E] border-[3px] border-[#1A6798] shadow-[inset_0_0_0_2px_#B6ECFD] active:scale-90 cursor-pointer landscape:col-start-3 landscape:row-start-2">
            <ArrowRight className="h-4 w-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
}
