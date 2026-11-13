import { useCallback, useEffect, useState } from 'react';
import { Bomb, Crosshair, Flag, ShieldCheck, Timer } from 'lucide-react';
import type { GameRendererProps } from '../types';
import {
  playErrorSound,
  playMoveSound,
  playScoreSound,
  playWinSound,
  triggerHapticFeedback,
} from '../../utils/soundEffects';

type PresetKey = 'normal' | 'expert';

const PRESETS: Record<PresetKey, { size: number; mines: number; label: string }> = {
  normal: { size: 8, mines: 9, label: '8×8 (9)' },
  expert: { size: 10, mines: 15, label: '10×10 (15)' },
};

interface Cell {
  isMine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
  exploded?: boolean;
}

function createEmptyBoard(size: number): Cell[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      isMine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    }))
  );
}

function populateMinesSafely(
  board: Cell[][],
  size: number,
  mines: number,
  safeR: number,
  safeC: number
) {
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    const isNearFirstClick = Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1;
    if (!board[r][c].isMine && !isNearFirstClick) {
      board[r][c].isMine = true;
      placed++;
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc].isMine) {
            count++;
          }
        }
      }
      board[r][c].adjacent = count;
    }
  }
}

function revealFlood(board: Cell[][], size: number, r: number, c: number) {
  const stack: [number, number][] = [[r, c]];
  while (stack.length > 0) {
    const [cr, cc] = stack.pop()!;
    const cell = board[cr][cc];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adjacent === 0 && !cell.isMine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (
            nr >= 0 &&
            nr < size &&
            nc >= 0 &&
            nc < size &&
            !board[nr][nc].revealed
          ) {
            stack.push([nr, nc]);
          }
        }
      }
    }
  }
}

const ADJ_TEXT_COLOR: Record<number, string> = {
  1: 'text-[#38BDF8] drop-shadow-[0_0_6px_rgba(56,189,248,0.45)]',
  2: 'text-[#34D399] drop-shadow-[0_0_6px_rgba(52,211,153,0.45)]',
  3: 'text-[#FB7185] drop-shadow-[0_0_6px_rgba(251,113,133,0.45)]',
  4: 'text-[#C084FC] drop-shadow-[0_0_6px_rgba(192,132,252,0.45)]',
  5: 'text-[#FBBF24] drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]',
  6: 'text-[#22D3EE] drop-shadow-[0_0_6px_rgba(34,211,238,0.45)]',
};

export function MinesweeperBoard({
  isGameOver,
  disabled,
  onMove,
}: GameRendererProps) {
  const [preset, setPreset] = useState<PresetKey>('normal');
  const { size, mines } = PRESETS[preset];

  const [board, setBoard] = useState<Cell[][]>(() => createEmptyBoard(8));
  const [minesGenerated, setMinesGenerated] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const [ended, setEnded] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const safeCells = size * size - mines;
  const flatCells = board.flat();
  const revealedSafe = flatCells.filter((c) => c.revealed && !c.isMine).length;
  const flagCount = flatCells.filter((c) => c.flagged).length;

  useEffect(() => {
    if (!minesGenerated || ended || isGameOver) return;
    const id = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [minesGenerated, ended, isGameOver]);

  const switchPreset = useCallback(
    (nextPreset: PresetKey) => {
      playMoveSound();
      const cfg = PRESETS[nextPreset];
      setPreset(nextPreset);
      setBoard(createEmptyBoard(cfg.size));
      setMinesGenerated(false);
      setEnded(false);
      setElapsedSec(0);
      onMove({ score: 0, isAbsolute: true });
    },
    [onMove]
  );

  const toggleFlagAt = (r: number, c: number) => {
    if (isGameOver || disabled || ended) return;
    const next = board.map((row) => row.map((cell) => ({ ...cell })));
    const target = next[r][c];
    if (target.revealed) return;
    playMoveSound();
    triggerHapticFeedback(10);
    target.flagged = !target.flagged;
    setBoard(next);
  };

  const handleCellTap = (r: number, c: number) => {
    if (isGameOver || disabled || ended) return;
    const next = board.map((row) => row.map((cell) => ({ ...cell })));
    const target = next[r][c];

    if (target.revealed) {
      if (target.adjacent > 0) {
        let adjFlags = 0;
        const unrevealedNeighbors: [number, number][] = [];
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
              if (next[nr][nc].flagged) adjFlags++;
              else if (!next[nr][nc].revealed) unrevealedNeighbors.push([nr, nc]);
            }
          }
        }
        if (adjFlags === target.adjacent && unrevealedNeighbors.length > 0) {
          for (const [nr, nc] of unrevealedNeighbors) {
            if (next[nr][nc].isMine) {
              next[nr][nc].exploded = true;
              for (const row of next) {
                for (const cell of row) {
                  if (cell.isMine) cell.revealed = true;
                }
              }
              setBoard(next);
              setEnded(true);
              playErrorSound();
              triggerHapticFeedback([35, 50]);
              const pts = revealedSafe * 15;
              setTimeout(
                () =>
                  onMove({
                    score: pts,
                    isAbsolute: true,
                    finish: true,
                    label: `${pts} PKT (${revealedSafe}/${safeCells} SICHER)`,
                  }),
                480
              );
              return;
            }
            revealFlood(next, size, nr, nc);
          }
          setBoard(next);
          playScoreSound(1);
          triggerHapticFeedback(12);
          const nowRev = next.flat().filter((cell) => cell.revealed && !cell.isMine).length;
          const score = nowRev * 15;
          if (nowRev >= safeCells) {
            setEnded(true);
            playWinSound();
            triggerHapticFeedback([20, 40, 30]);
            const speedBonus = Math.max(50, 300 - elapsedSec * 2);
            setTimeout(
              () =>
                onMove({
                  score: score + speedBonus,
                  isAbsolute: true,
                  finish: true,
                  label: `${score + speedBonus} PKT (ALLE ${safeCells} FREI IN ${elapsedSec}S)`,
                }),
              300
            );
          } else {
            onMove({ score, isAbsolute: true });
          }
        }
      }
      return;
    }

    if (flagMode) {
      toggleFlagAt(r, c);
      return;
    }

    if (target.flagged) return;

    if (!minesGenerated) {
      populateMinesSafely(next, size, mines, r, c);
      setMinesGenerated(true);
    }

    if (next[r][c].isMine) {
      next[r][c].exploded = true;
      for (const row of next) {
        for (const cell of row) {
          if (cell.isMine) cell.revealed = true;
        }
      }
      setBoard(next);
      setEnded(true);
      playErrorSound();
      triggerHapticFeedback([35, 50]);
      const pts = revealedSafe * 15;
      setTimeout(
        () =>
          onMove({
            score: pts,
            isAbsolute: true,
            finish: true,
            label: `${pts} PKT (${revealedSafe}/${safeCells} SICHER)`,
          }),
        480
      );
      return;
    }

    revealFlood(next, size, r, c);
    setBoard(next);

    const nowRevealed = next.flat().filter((cell) => cell.revealed && !cell.isMine).length;
    const score = nowRevealed * 15;

    if (nowRevealed >= safeCells) {
      setEnded(true);
      playWinSound();
      triggerHapticFeedback([20, 40, 30]);
      const speedBonus = Math.max(50, 300 - elapsedSec * 2);
      setTimeout(
        () =>
          onMove({
            score: score + speedBonus,
            isAbsolute: true,
            finish: true,
            label: `${score + speedBonus} PKT (ALLE ${safeCells} FREI IN ${elapsedSec}S)`,
          }),
        300
      );
    } else {
      playScoreSound(1);
      triggerHapticFeedback(10);
      onMove({ score, isAbsolute: true });
    }
  };

  return (
    <div className="flex h-full w-full max-w-5xl flex-1 min-h-0 flex-col items-center justify-center gap-2 sm:gap-3 px-1 sm:px-3 select-none">
      {/* INTEGRIERTE KOMMANDO-RADAR HUD-LEISTE */}
      <div className="flex flex-wrap items-center justify-between gap-2 w-full max-w-[min(95vw,36rem)] landscape:max-w-[min(82vw,38rem)] px-3 sm:px-4 py-1.5 sm:py-2 bg-[#0F1B2B]/95 border-[3px] border-[#38BDF8] shadow-[0_8px_20px_rgba(0,0,0,0.5)] text-xs sm:text-sm font-arcade uppercase text-[#E2E8F0] shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="inline-flex items-center gap-1 text-[#A7F3D0]">
            <ShieldCheck className="h-4 w-4 text-[#34D399]" />
            FREI: <strong className="text-white">{revealedSafe}/{safeCells}</strong>
          </span>
          <span className="inline-flex items-center gap-1 text-[#FDE68A]">
            <Bomb className="h-3.5 w-3.5 text-[#FBBF24]" />
            MINEN: <strong className="text-white">{Math.max(0, mines - flagCount)}</strong>
          </span>
          <span className="inline-flex items-center gap-1 text-[#7DD3FC]">
            <Timer className="h-3.5 w-3.5 text-[#38BDF8]" />
            <strong>{elapsedSec}S</strong>
          </span>
        </div>

        {/* Schwierigkeits- & Werkzeug-Umschalter */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => switchPreset(preset === 'normal' ? 'expert' : 'normal')}
            className="px-2.5 py-0.5 text-[11px] font-arcade uppercase bg-[#1E293B] hover:bg-[#334155] text-[#7DD3FC] border-2 border-[#475569] cursor-pointer active:scale-95"
          >
            {PRESETS[preset].label}
          </button>

          <button
            type="button"
            onClick={() => {
              playMoveSound();
              setFlagMode((v) => !v);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-0.5 text-[11px] font-arcade uppercase border-2 transition-all cursor-pointer active:scale-95 ${
              flagMode
                ? 'bg-[#D97706] text-white border-[#FEF08A] shadow-[0_0_12px_rgba(245,158,11,0.55)]'
                : 'bg-[#0284C7] text-white border-[#7DD3FC] shadow-[0_0_12px_rgba(14,165,233,0.45)]'
            }`}
          >
            {flagMode ? <Flag className="h-3.5 w-3.5" /> : <Crosshair className="h-3.5 w-3.5" />}
            <span>{flagMode ? 'FLAGGE SETZEN' : 'AUFDECKEN'}</span>
          </button>
        </div>
      </div>

      {/* GROSSFLÄCHIGES TAKTIK-MINENFELD */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        <div
          className="grid gap-1 sm:gap-1.5 landscape:gap-1 p-2 sm:p-3.5 landscape:p-2 bg-gradient-to-br from-[#132235] via-[#0F1B2B] to-[#09101B] border-[4px] border-[#38BDF8] shadow-[inset_0_0_24px_rgba(56,189,248,0.18),0_16px_36px_rgba(0,0,0,0.65)] w-[min(94vw,calc(100dvh-9rem),36rem)] landscape:w-[min(62vw,calc(100dvh-5.5rem),29rem)] aspect-square"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => handleCellTap(r, c)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  toggleFlagAt(r, c);
                }}
                className={`relative flex items-center justify-center font-arcade transition-all duration-100 cursor-pointer active:scale-95 border-2 overflow-hidden ${
                  size === 10
                    ? 'text-xs sm:text-base landscape:text-xs'
                    : 'text-sm sm:text-xl landscape:text-sm'
                } ${
                  cell.revealed
                    ? cell.isMine
                      ? cell.exploded
                        ? 'bg-gradient-to-br from-[#F43F5E] to-[#9F1239] text-white border-white shadow-[0_0_16px_#F43F5E] screen-shake z-10'
                        : 'bg-[#4C0519] text-[#FDA4AF] border-[#F43F5E]'
                      : 'bg-[#09121E] border-[#1E293B] shadow-inner'
                    : cell.flagged
                      ? 'bg-gradient-to-br from-[#78350F] to-[#451A03] text-[#FDE68A] border-[#FBBF24] shadow-[0_0_10px_rgba(251,191,36,0.35)]'
                      : 'bg-gradient-to-br from-[#334155] to-[#1E293B] hover:from-[#475569] hover:to-[#334155] border-[#64748B] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.25),0_2px_0_rgba(0,0,0,0.45)]'
                }`}
              >
                {cell.revealed ? (
                  cell.isMine ? (
                    <Bomb
                      className={`${
                        size === 10 ? 'h-3.5 w-3.5 sm:h-4 sm:w-4' : 'h-4 w-4 sm:h-5 sm:w-5'
                      }`}
                    />
                  ) : cell.adjacent > 0 ? (
                    <span className={ADJ_TEXT_COLOR[cell.adjacent] || 'text-white'}>
                      {cell.adjacent}
                    </span>
                  ) : (
                    ''
                  )
                ) : cell.flagged ? (
                  <Flag
                    className={`${
                      size === 10 ? 'h-3.5 w-3.5 sm:h-4 sm:w-4' : 'h-4 w-4 sm:h-5 sm:w-5'
                    } text-[#FBBF24] fill-[#FBBF24]`}
                  />
                ) : (
                  ''
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
