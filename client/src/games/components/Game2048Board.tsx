import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Undo2 } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { CrystalButton, CrystalReadout } from '../../components/CrystalUI';
import {
  playMoveSound,
  playScoreSound,
  playWinSound,
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

const TILE_COLORS: Record<number, string> = {
  0: 'bg-[#CBD5E1]/70 text-transparent border-[#94A3B8]',
  2: 'bg-[#FFFFFF] text-[#1E293B] border-[#64748B] shadow-[0_3px_0_rgba(15,23,42,0.18)]',
  4: 'bg-[#FEF3C7] text-[#78350F] border-[#D97706] shadow-[0_3px_0_rgba(120,53,15,0.22)]',
  8: 'bg-[#F59E0B] text-white border-[#92400E] shadow-[0_3px_0_rgba(120,53,15,0.3)]',
  16: 'bg-[#EA580C] text-white border-[#9A3412] shadow-[0_3px_0_rgba(154,52,18,0.32)]',
  32: 'bg-[#E11D48] text-white border-[#881337] shadow-[0_3px_0_rgba(136,19,55,0.32)]',
  64: 'bg-[#DB2777] text-white border-[#831843] shadow-[0_3px_0_rgba(131,24,67,0.32)]',
  128: 'bg-[#7C3AED] text-white border-[#4C1D95] shadow-[0_4px_0_rgba(76,29,149,0.35)]',
  256: 'bg-[#4F46E5] text-white border-[#312E81] shadow-[0_4px_0_rgba(49,46,129,0.35)]',
  512: 'bg-[#0284C7] text-white border-[#075985] shadow-[0_4px_0_rgba(7,89,133,0.35)]',
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
      } else if (gained > 0) {
        playScoreSound(gained >= 64 ? 3 : gained >= 16 ? 2 : 1);
      } else {
        playMoveSound();
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
    <div className="flex h-full w-full max-w-6xl flex-1 min-h-0 flex-col lg:flex-row landscape:flex-row items-center justify-center gap-2.5 sm:gap-5 px-1 sm:px-3 select-none">
      {/* Hochformat Kopfzeile */}
      <div className="flex lg:hidden landscape:hidden items-center justify-between w-full max-w-[min(92vw,33rem)] px-3 py-1.5 bg-[#FFFBEB] border-[3px] border-[#92400E] shadow-[0_4px_0_rgba(15,23,42,0.28)] text-xs sm:text-sm font-arcade uppercase text-[#78350F] shrink-0">
        <div className="flex items-center gap-3">
          <span>
            SCORE: <strong className="text-[#D97706]">{score}</strong>
            {lastGain > 0 && <em className="ml-1 text-[#059669] not-italic">+{lastGain}</em>}
          </span>
          <span>
            MAX: <strong className="text-[#1E293B]">{maxTile}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={history.length === 0}
            onClick={handleUndo}
            className="inline-flex items-center gap-1 bg-[#F8FAFC] disabled:opacity-40 border-2 border-[#334155] px-2 py-0.5 text-[11px] font-arcade text-[#1E293B] cursor-pointer active:scale-95"
          >
            <Undo2 className="h-3.5 w-3.5" />
            <span>{history.length}</span>
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
            className="bg-[#D97706] hover:bg-[#B45309] border-2 border-[#78350F] px-2.5 py-0.5 text-[11px] font-arcade text-white cursor-pointer active:scale-95"
          >
            WERTEN
          </button>
        </div>
      </div>

      {/* GROSSFLÄCHIGES 4×4 SPIELBRETT */}
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
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
            if (Math.abs(dx) > Math.abs(dy)) {
              performMove(dx > 0 ? 'right' : 'left');
            } else {
              performMove(dy > 0 ? 'down' : 'up');
            }
          }}
          className="grid grid-cols-4 gap-2 sm:gap-3 landscape:gap-2 p-2.5 sm:p-4 landscape:p-2.5 bg-[#E2E8F0] border-[4px] border-[#1E293B] shadow-[inset_0_0_0_4px_#F8FAFC,0_12px_28px_rgba(15,23,42,0.45)] w-[min(92vw,calc(100dvh-11.5rem),33rem)] landscape:w-[min(58vw,calc(100dvh-3.5rem),29rem)] aspect-square touch-none"
        >
          {grid.flat().map((val, idx) => (
            <div
              key={idx}
              className={`relative flex items-center justify-center font-arcade border-2 transition-all duration-150 overflow-hidden ${
                val >= 1024
                  ? 'text-lg sm:text-2xl landscape:text-base'
                  : val >= 128
                    ? 'text-xl sm:text-3xl landscape:text-xl'
                    : 'text-2xl sm:text-4xl landscape:text-2xl'
              } ${TILE_COLORS[val] || 'bg-[#059669] text-white border-[#064E3B] shadow-[0_4px_0_rgba(6,78,59,0.4)]'}`}
              style={{
                clipPath: 'polygon(0% 3%, 100% 0%, 98% 97%, 2% 100%)',
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
      </div>

      {/* Rechte Seitenleiste & Pfeil-Steuerung */}
      <aside className="flex flex-col items-center justify-center gap-2.5 sm:gap-3.5 w-full lg:w-60 landscape:w-52 shrink-0">
        <div className="hidden lg:flex landscape:flex flex-col gap-2 w-full bg-[#F8FAFC] border-[3px] border-[#334155] shadow-[inset_0_0_0_3px_#FFFFFF,0_6px_0_rgba(15,23,42,0.3)] p-3 text-center">
          <CrystalReadout
            variant="gold"
            label="PUNKTE"
            value={lastGain > 0 ? `${score} (+${lastGain})` : score}
          />
          <CrystalReadout label="HÖCHSTE KACHEL" value={maxTile} />

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <CrystalButton
              size="sm"
              variant="secondary"
              disabled={history.length === 0}
              onClick={handleUndo}
            >
              <Undo2 className="h-4 w-4" />
              <span>UNDO ({history.length})</span>
            </CrystalButton>
            <CrystalButton
              size="sm"
              variant="gold"
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
            >
              WERTEN
            </CrystalButton>
          </div>
        </div>

        {/* Ergonomische Pfeil-Steuerung */}
        <div className="flex items-center justify-center gap-2 lg:grid lg:grid-cols-3 landscape:grid landscape:grid-cols-3 lg:gap-2 landscape:gap-1.5 mx-auto">
          <div className="hidden lg:block landscape:block" />
          <button
            type="button"
            aria-label="Hoch"
            onClick={() => performMove('up')}
            className="grid h-11 w-13 sm:h-12 sm:w-14 lg:h-12 lg:w-12 landscape:h-11 landscape:w-11 place-items-center bg-[#F8FAFC] hover:bg-[#FFFFFF] text-[#1E293B] border-[3px] border-[#334155] shadow-[inset_0_0_0_2px_#FFFFFF,0_4px_0_rgba(15,23,42,0.3)] active:scale-90 cursor-pointer lg:col-start-2 lg:row-start-1 landscape:col-start-2 landscape:row-start-1"
          >
            <ArrowUp className="h-5 w-5 stroke-[3]" />
          </button>
          <button
            type="button"
            aria-label="Links"
            onClick={() => performMove('left')}
            className="grid h-11 w-13 sm:h-12 sm:w-14 lg:h-12 lg:w-12 landscape:h-11 landscape:w-11 place-items-center bg-[#F8FAFC] hover:bg-[#FFFFFF] text-[#1E293B] border-[3px] border-[#334155] shadow-[inset_0_0_0_2px_#FFFFFF,0_4px_0_rgba(15,23,42,0.3)] active:scale-90 cursor-pointer lg:col-start-1 lg:row-start-2 landscape:col-start-1 landscape:row-start-2"
          >
            <ArrowLeft className="h-5 w-5 stroke-[3]" />
          </button>
          <button
            type="button"
            aria-label="Runter"
            onClick={() => performMove('down')}
            className="grid h-11 w-13 sm:h-12 sm:w-14 lg:h-12 lg:w-12 landscape:h-11 landscape:w-11 place-items-center bg-[#F8FAFC] hover:bg-[#FFFFFF] text-[#1E293B] border-[3px] border-[#334155] shadow-[inset_0_0_0_2px_#FFFFFF,0_4px_0_rgba(15,23,42,0.3)] active:scale-90 cursor-pointer lg:col-start-2 lg:row-start-2 landscape:col-start-2 landscape:row-start-2"
          >
            <ArrowDown className="h-5 w-5 stroke-[3]" />
          </button>
          <button
            type="button"
            aria-label="Rechts"
            onClick={() => performMove('right')}
            className="grid h-11 w-13 sm:h-12 sm:w-14 lg:h-12 lg:w-12 landscape:h-11 landscape:w-11 place-items-center bg-[#F8FAFC] hover:bg-[#FFFFFF] text-[#1E293B] border-[3px] border-[#334155] shadow-[inset_0_0_0_2px_#FFFFFF,0_4px_0_rgba(15,23,42,0.3)] active:scale-90 cursor-pointer lg:col-start-3 lg:row-start-2 landscape:col-start-3 landscape:row-start-2"
          >
            <ArrowRight className="h-5 w-5 stroke-[3]" />
          </button>
        </div>
      </aside>
    </div>
  );
}
