import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CheckCircle2, Undo2 } from 'lucide-react';
import type { GameRendererProps } from '../types';
import {
  playMoveSound,
  playScoreSound,
  playWinSound,
  triggerHapticFeedback,
} from '../../utils/soundEffects';

type Grid = number[][];
type Dir = 'up' | 'down' | 'left' | 'right';

interface HistorySnapshot {
  grid: Grid;
  score: number;
}

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

const TILE_STYLES: Record<number, string> = {
  0: 'bg-[#17110B]/90 text-transparent border-[#3E2C1C] shadow-inner',
  2: 'bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] text-[#451A03] border-[#F59E0B] shadow-[0_4px_0_rgba(0,0,0,0.35)]',
  4: 'bg-gradient-to-br from-[#FEF08A] to-[#FCD34D] text-[#451A03] border-[#D97706] shadow-[0_4px_0_rgba(0,0,0,0.35)]',
  8: 'bg-gradient-to-br from-[#FBBF24] to-[#D97706] text-white border-[#FEF3C7] shadow-[0_4px_10px_rgba(245,158,11,0.35)]',
  16: 'bg-gradient-to-br from-[#FB923C] to-[#EA580C] text-white border-[#FFEDD5] shadow-[0_4px_12px_rgba(234,88,12,0.4)]',
  32: 'bg-gradient-to-br from-[#F87171] to-[#DC2626] text-white border-[#FEE2E2] shadow-[0_4px_12px_rgba(220,38,38,0.45)]',
  64: 'bg-gradient-to-br from-[#FB7185] to-[#E11D48] text-white border-[#FFE4E6] shadow-[0_4px_14px_rgba(225,29,72,0.5)]',
  128: 'bg-gradient-to-br from-[#C084FC] to-[#7C3AED] text-white border-[#F3E8FF] shadow-[0_0_16px_rgba(139,92,246,0.55)]',
  256: 'bg-gradient-to-br from-[#818CF8] to-[#4F46E5] text-white border-[#E0E7FF] shadow-[0_0_18px_rgba(79,70,229,0.55)]',
  512: 'bg-gradient-to-br from-[#38BDF8] to-[#0284C7] text-white border-[#E0F2FE] shadow-[0_0_20px_rgba(14,165,233,0.6)]',
  1024: 'bg-gradient-to-br from-[#34D399] to-[#059669] text-white border-[#D1FAE5] shadow-[0_0_22px_rgba(16,185,129,0.65)]',
  2048: 'bg-gradient-to-br from-[#FEF08A] via-[#F59E0B] to-[#B45309] text-white border-white shadow-[0_0_28px_rgba(251,191,36,0.85)]',
};

export function Game2048Board({
  isGameOver,
  disabled,
  onMove,
}: GameRendererProps) {
  const [grid, setGrid] = useState<Grid>(() => createInitialGrid());
  const [score, setScore] = useState(0);
  const [lastGain, setLastGain] = useState<number>(0);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const finishedRef = useRef(false);

  const maxTile = Math.max(...grid.flat());

  const performMove = useCallback(
    (dir: Dir) => {
      if (isGameOver || disabled || finishedRef.current) return;
      const { next, gained, moved } = moveGrid(grid, dir);
      if (!moved) return;

      setHistory((prev) => [...prev.slice(-2), { grid, score }]);

      const nextScore = score + gained;
      const nextMaxTile = Math.max(...next.flat());
      setGrid(next);
      setScore(nextScore);
      setLastGain(gained);

      if (nextMaxTile >= 2048 && maxTile < 2048) {
        playWinSound();
        triggerHapticFeedback([20, 40, 30]);
      } else if (gained > 0) {
        playScoreSound(gained >= 64 ? 3 : gained >= 16 ? 2 : 1);
        triggerHapticFeedback(12);
      } else {
        playMoveSound();
        triggerHapticFeedback(6);
      }

      if (!hasAnyMove(next)) {
        finishedRef.current = true;
        onMove({
          score: nextScore,
          isAbsolute: true,
          finish: true,
          label: `${nextScore} PKT (MAX KACHEL ${nextMaxTile})`,
        });
      } else if (gained > 0) {
        onMove({ score: nextScore, isAbsolute: true });
      }
    },
    [grid, score, maxTile, isGameOver, disabled, onMove]
  );

  const handleUndo = () => {
    if (history.length === 0 || finishedRef.current) return;
    const prev = history[history.length - 1];
    playMoveSound();
    setGrid(prev.grid);
    setScore(prev.score);
    setLastGain(0);
    setHistory((h) => h.slice(0, -1));
    onMove({ score: prev.score, isAbsolute: true });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        performMove('up');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        performMove('down');
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        performMove('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        performMove('right');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [performMove]);

  return (
    <div className="flex h-full w-full max-w-5xl flex-1 min-h-0 flex-col items-center justify-center gap-2 sm:gap-3 px-1 sm:px-3 select-none">
      {/* INTEGRIERTE GOLDEN-MATRIX HUD-LEISTE */}
      <div className="flex flex-wrap items-center justify-between gap-2 w-full max-w-[min(94vw,35rem)] landscape:max-w-[min(86vw,44rem)] px-3 sm:px-4 py-1.5 sm:py-2 bg-[#271B0E]/95 border-[3px] border-[#F59E0B] shadow-[0_8px_20px_rgba(0,0,0,0.5)] text-xs sm:text-sm font-arcade uppercase text-[#FEF3C7] shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <span>
            SCORE: <strong className="text-[#FBBF24]">{score}</strong>
            {lastGain > 0 && (
              <em className="ml-1.5 text-[#34D399] not-italic">+{lastGain}</em>
            )}
          </span>
          <span>
            MAX KACHEL: <strong className="text-white">{maxTile}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={history.length === 0}
            onClick={handleUndo}
            title="Letzten Zug rückgängig machen"
            className="inline-flex items-center gap-1 bg-[#140D06] hover:bg-[#3E2C1C] disabled:opacity-40 border-2 border-[#D97706] px-2.5 py-0.5 text-[11px] font-arcade text-[#FEF3C7] cursor-pointer active:scale-95"
          >
            <Undo2 className="h-3.5 w-3.5" />
            <span>UNDO ({history.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (finishedRef.current) return;
              finishedRef.current = true;
              onMove({
                score,
                isAbsolute: true,
                finish: true,
                label: `${score} PKT (MAX KACHEL ${maxTile})`,
              });
            }}
            className="inline-flex items-center gap-1 bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#FBBF24] hover:to-[#F59E0B] border-2 border-[#FEF3C7] px-2.5 py-0.5 text-[11px] font-arcade text-[#451A03] cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>WERTEN</span>
          </button>
        </div>
      </div>

      {/* HAUPTBEREICH: 4×4 LUXURY MATRIX + ERGONOMISCHES TOUCH/CLICK D-PAD */}
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
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
            if (Math.abs(dx) > Math.abs(dy)) {
              performMove(dx > 0 ? 'right' : 'left');
            } else {
              performMove(dy > 0 ? 'down' : 'up');
            }
          }}
          className="grid grid-cols-4 gap-2 sm:gap-3 landscape:gap-2 p-2.5 sm:p-4 landscape:p-2.5 bg-gradient-to-br from-[#2C1E10] via-[#21160B] to-[#140D06] border-[4px] border-[#F59E0B] shadow-[inset_0_0_24px_rgba(245,158,11,0.2),0_16px_36px_rgba(0,0,0,0.65)] w-[min(92vw,calc(100dvh-11.5rem),34rem)] landscape:w-[min(58vw,calc(100dvh-5.5rem),28rem)] aspect-square touch-none"
        >
          {grid.flat().map((val, idx) => (
            <div
              key={idx}
              className={`relative flex items-center justify-center font-arcade border-[2.5px] transition-all duration-150 overflow-hidden ${
                val >= 1024
                  ? 'text-lg sm:text-2xl landscape:text-base'
                  : val >= 128
                    ? 'text-xl sm:text-3xl landscape:text-xl'
                    : 'text-2xl sm:text-4xl landscape:text-2xl'
              } ${
                TILE_STYLES[val] ||
                'bg-gradient-to-br from-[#FEF08A] via-[#F59E0B] to-[#B45309] text-white border-white shadow-[0_0_24px_#FBBF24]'
              }`}
            >
              {val > 0 && (
                <div
                  className="pointer-events-none absolute inset-0 bg-white/15"
                  style={{ clipPath: 'polygon(0 0, 58% 0, 32% 100%, 0 100%)' }}
                />
              )}
              <span className="relative z-10 drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">
                {val > 0 ? val : ''}
              </span>
            </div>
          ))}
        </div>

        {/* Edles Bronze-Steuerkreuz */}
        <div className="flex items-center justify-center gap-2 lg:grid lg:grid-cols-3 landscape:grid landscape:grid-cols-3 lg:gap-2 landscape:gap-1.5 shrink-0">
          <div className="hidden lg:block landscape:block" />
          <button
            type="button"
            aria-label="Hoch"
            onClick={() => performMove('up')}
            className="grid h-11 w-13 sm:h-12 sm:w-14 lg:h-13 lg:w-13 landscape:h-11 landscape:w-11 place-items-center bg-[#451A03]/90 hover:bg-[#78350F] text-[#FEF3C7] border-[3px] border-[#F59E0B] shadow-[0_4px_0_rgba(0,0,0,0.45)] active:scale-90 cursor-pointer lg:col-start-2 lg:row-start-1 landscape:col-start-2 landscape:row-start-1"
          >
            <ArrowUp className="h-5 w-5 stroke-[3]" />
          </button>
          <button
            type="button"
            aria-label="Links"
            onClick={() => performMove('left')}
            className="grid h-11 w-13 sm:h-12 sm:w-14 lg:h-13 lg:w-13 landscape:h-11 landscape:w-11 place-items-center bg-[#451A03]/90 hover:bg-[#78350F] text-[#FEF3C7] border-[3px] border-[#F59E0B] shadow-[0_4px_0_rgba(0,0,0,0.45)] active:scale-90 cursor-pointer lg:col-start-1 lg:row-start-2 landscape:col-start-1 landscape:row-start-2"
          >
            <ArrowLeft className="h-5 w-5 stroke-[3]" />
          </button>
          <button
            type="button"
            aria-label="Runter"
            onClick={() => performMove('down')}
            className="grid h-11 w-13 sm:h-12 sm:w-14 lg:h-13 lg:w-13 landscape:h-11 landscape:w-11 place-items-center bg-[#451A03]/90 hover:bg-[#78350F] text-[#FEF3C7] border-[3px] border-[#F59E0B] shadow-[0_4px_0_rgba(0,0,0,0.45)] active:scale-90 cursor-pointer lg:col-start-2 lg:row-start-2 landscape:col-start-2 landscape:row-start-2"
          >
            <ArrowDown className="h-5 w-5 stroke-[3]" />
          </button>
          <button
            type="button"
            aria-label="Rechts"
            onClick={() => performMove('right')}
            className="grid h-11 w-13 sm:h-12 sm:w-14 lg:h-13 lg:w-13 landscape:h-11 landscape:w-11 place-items-center bg-[#451A03]/90 hover:bg-[#78350F] text-[#FEF3C7] border-[3px] border-[#F59E0B] shadow-[0_4px_0_rgba(0,0,0,0.45)] active:scale-90 cursor-pointer lg:col-start-3 lg:row-start-2 landscape:col-start-3 landscape:row-start-2"
          >
            <ArrowRight className="h-5 w-5 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
}
