import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { CrystalButton, CrystalReadout } from '../../components/CrystalUI';

type Grid = number[][];
type Dir = 'up' | 'down' | 'left' | 'right';

function spawnTile(grid: Grid): Grid {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = grid.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function createInitialGrid(): Grid {
  const empty = Array.from({ length: 4 }, () => Array(4).fill(0));
  return spawnTile(spawnTile(empty));
}

function slideLine(line: number[]): { row: number[]; gained: number } {
  const nonZero = line.filter((n) => n !== 0);
  const merged: number[] = [];
  let gained = 0;
  for (let i = 0; i < nonZero.length; i++) {
    if (nonZero[i] === nonZero[i + 1]) {
      const val = nonZero[i] * 2;
      merged.push(val);
      gained += val;
      i++;
    } else {
      merged.push(nonZero[i]);
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged, gained };
}

function moveGrid(grid: Grid, dir: Dir): { next: Grid; gained: number; moved: boolean } {
  let next = grid.map((r) => [...r]);
  let gained = 0;
  let moved = false;

  const setLine = (idx: number, vals: number[]) => {
    for (let i = 0; i < 4; i++) {
      if (dir === 'left') next[idx][i] = vals[i];
      if (dir === 'right') next[idx][3 - i] = vals[i];
      if (dir === 'up') next[i][idx] = vals[i];
      if (dir === 'down') next[3 - i][idx] = vals[i];
    }
  };

  for (let idx = 0; idx < 4; idx++) {
    const line: number[] = [];
    for (let i = 0; i < 4; i++) {
      if (dir === 'left') line.push(grid[idx][i]);
      if (dir === 'right') line.push(grid[idx][3 - i]);
      if (dir === 'up') line.push(grid[i][idx]);
      if (dir === 'down') line.push(grid[3 - i][idx]);
    }
    const res = slideLine(line);
    if (res.row.some((v, i) => v !== line[i])) moved = true;
    gained += res.gained;
    setLine(idx, res.row);
  }

  if (moved) next = spawnTile(next);
  return { next, gained, moved };
}

function hasAnyMove(grid: Grid): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) return true;
      if (r < 3 && grid[r][c] === grid[r + 1][c]) return true;
      if (c < 3 && grid[r][c] === grid[r][c + 1]) return true;
    }
  }
  return false;
}

const TILE_COLORS: Record<number, string> = {
  0: 'bg-[#52A9D6]/55 text-transparent border-[#17608E]/50',
  2: 'bg-[#DDF6FF] text-[#15608E] border-[#17608E]',
  4: 'bg-[#B6ECFD] text-[#15608E] border-[#17608E]',
  8: 'bg-[#5AC2EE] text-white border-[#17608E]',
  16: 'bg-[#2B9FD6] text-white border-[#0E5A8A]',
  32: 'bg-[#17689A] text-white border-[#0B3B59]',
  64: 'bg-[#FDE0A6] text-[#8C4E0C] border-[#C48232]',
  128: 'bg-[#F6B969] text-white border-[#C48232]',
};

export function Game2048Board({
  isGameOver,
  disabled,
  onMove,
}: GameRendererProps) {
  const [grid, setGrid] = useState<Grid>(() => createInitialGrid());
  const [score, setScore] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const finishedRef = useRef(false);

  const performMove = useCallback(
    (dir: Dir) => {
      if (isGameOver || disabled || finishedRef.current) return;
      const { next, gained, moved } = moveGrid(grid, dir);
      if (!moved) return;

      const nextScore = score + gained;
      setGrid(next);
      setScore(nextScore);

      if (!hasAnyMove(next)) {
        finishedRef.current = true;
        onMove({ score: nextScore, isAbsolute: true, finish: true });
      } else if (gained > 0) {
        onMove({ score: nextScore, isAbsolute: true });
      }
    },
    [grid, score, isGameOver, disabled, onMove]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); performMove('up'); }
      if (e.key === 'ArrowDown') { e.preventDefault(); performMove('down'); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); performMove('left'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); performMove('right'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [performMove]);

  return (
    <div className="flex flex-col items-center w-full max-w-[18.5rem] sm:max-w-xs landscape:max-w-xl landscape:grid landscape:grid-cols-[auto_11.5rem] landscape:items-center landscape:justify-center landscape:gap-5 gap-2.5 select-none">
      {/* Hochformat Kopfzeile */}
      <div className="flex landscape:hidden items-center justify-between w-full px-2 py-1.5 bg-[#9CE0FA] border-2 border-[#17608E] text-xs font-arcade uppercase text-[#15608E]">
        <span>SCORE: <strong className="text-[#0E486C]">{score}</strong></span>
        <button
          type="button"
          onClick={() => {
            if (finishedRef.current) return;
            finishedRef.current = true;
            onMove({ score, isAbsolute: true, finish: true });
          }}
          className="bg-[#2B9FD6] border-2 border-[#0E5A8A] px-2.5 py-0.5 text-[11px] font-arcade text-white cursor-pointer active:scale-95"
        >
          FINISH
        </button>
      </div>

      {/* 4x4 Spielfeld mit Wischgesten */}
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
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
          if (Math.abs(dx) > Math.abs(dy)) {
            performMove(dx > 0 ? 'right' : 'left');
          } else {
            performMove(dy > 0 ? 'down' : 'up');
          }
        }}
        className="grid grid-cols-4 gap-2 landscape:gap-1.5 p-2.5 landscape:p-2 bg-[#9CE0FA] border-[4px] border-[#17608E] shadow-[inset_0_0_0_4px_#66C4EE,0_8px_0_rgba(14,62,96,0.38)] w-full landscape:w-[min(46vw,calc(100dvh-5.2rem),21rem)] aspect-square touch-none"
      >
        {grid.flat().map((val, idx) => (
          <div
            key={idx}
            className={`relative flex items-center justify-center font-arcade border-2 transition-all overflow-hidden ${
              val >= 1024 ? 'text-base landscape:text-sm' : val >= 128 ? 'text-lg landscape:text-base' : 'text-xl sm:text-2xl landscape:text-lg'
            } ${TILE_COLORS[val] || 'bg-[#EAA14B] text-white border-[#C48232]'}`}
            style={{
              clipPath: 'polygon(0% 4%, 100% 0%, 97% 96%, 3% 100%)',
            }}
          >
            {val > 0 && (
              <div
                className="pointer-events-none absolute inset-0 bg-white/20"
                style={{ clipPath: 'polygon(0 0, 58% 0, 32% 100%, 0 100%)' }}
              />
            )}
            <span className="relative z-10">{val > 0 ? val : ''}</span>
          </div>
        ))}
      </div>

      {/* Rechte Seitenleiste im Querformat & untere Pfeil-Steuerung im Hochformat */}
      <div className="flex flex-col items-center landscape:items-stretch gap-2.5 w-full">
        <div className="hidden landscape:flex flex-col items-center bg-[#9CE0FA] border-[3px] border-[#17608E] shadow-[inset_0_0_0_3px_#66C4EE] px-3 py-2.5 text-center">
          <CrystalReadout label="SCORE" value={score} />
        </div>

        {/* Pfeil-Steuerung im Crystal-Look */}
        <div className="flex items-center justify-center gap-2 landscape:grid landscape:grid-cols-3 landscape:gap-1.5 landscape:mx-auto">
          <div className="hidden landscape:block" />
          <button type="button" aria-label="Hoch" onClick={() => performMove('up')} className="grid h-9 w-11 landscape:h-10 landscape:w-10 place-items-center bg-[#88D6F8] hover:bg-[#9CE0FA] text-[#15608E] border-[3px] border-[#1A6798] shadow-[inset_0_0_0_2px_#B6ECFD] active:scale-90 cursor-pointer landscape:col-start-2 landscape:row-start-1">
            <ArrowUp className="h-4 w-4 stroke-[3]" />
          </button>
          <button type="button" aria-label="Links" onClick={() => performMove('left')} className="grid h-9 w-11 landscape:h-10 landscape:w-10 place-items-center bg-[#88D6F8] hover:bg-[#9CE0FA] text-[#15608E] border-[3px] border-[#1A6798] shadow-[inset_0_0_0_2px_#B6ECFD] active:scale-90 cursor-pointer landscape:col-start-1 landscape:row-start-2">
            <ArrowLeft className="h-4 w-4 stroke-[3]" />
          </button>
          <button type="button" aria-label="Runter" onClick={() => performMove('down')} className="grid h-9 w-11 landscape:h-10 landscape:w-10 place-items-center bg-[#88D6F8] hover:bg-[#9CE0FA] text-[#15608E] border-[3px] border-[#1A6798] shadow-[inset_0_0_0_2px_#B6ECFD] active:scale-90 cursor-pointer landscape:col-start-2 landscape:row-start-2">
            <ArrowDown className="h-4 w-4 stroke-[3]" />
          </button>
          <button type="button" aria-label="Rechts" onClick={() => performMove('right')} className="grid h-9 w-11 landscape:h-10 landscape:w-10 place-items-center bg-[#88D6F8] hover:bg-[#9CE0FA] text-[#15608E] border-[3px] border-[#1A6798] shadow-[inset_0_0_0_2px_#B6ECFD] active:scale-90 cursor-pointer landscape:col-start-3 landscape:row-start-2">
            <ArrowRight className="h-4 w-4 stroke-[3]" />
          </button>
        </div>

        <div className="hidden landscape:block w-full">
          <CrystalButton
            size="sm"
            fullWidth
            onClick={() => {
              if (finishedRef.current) return;
              finishedRef.current = true;
              onMove({ score, isAbsolute: true, finish: true });
            }}
          >
            FINISH
          </CrystalButton>
        </div>
      </div>
    </div>
  );
}
