import { useCallback, useEffect, useState } from 'react';
import { Bomb, Flag } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { CrystalButton, CrystalReadout } from '../../components/CrystalUI';
import {
  playErrorSound,
  playMoveSound,
  playScoreSound,
  playWinSound,
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
  1: 'text-[#2563EB]',
  2: 'text-[#059669]',
  3: 'text-[#E11D48]',
  4: 'text-[#7C3AED]',
  5: 'text-[#D97706]',
  6: 'text-[#0891B2]',
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
    target.flagged = !target.flagged;
    setBoard(next);
  };

  const handleCellTap = (r: number, c: number) => {
    if (isGameOver || disabled || ended) return;
    const next = board.map((row) => row.map((cell) => ({ ...cell })));
    const target = next[r][c];

    // Chord-Klick auf bereits aufgedeckte Zahl, wenn gleich viele Flaggen rundherum gesetzt sind
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
          const nowRev = next.flat().filter((cell) => cell.revealed && !cell.isMine).length;
          const score = nowRev * 15;
          if (nowRev >= safeCells) {
            setEnded(true);
            playWinSound();
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

    // Garantierter sicherer erster Klick!
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
      onMove({ score, isAbsolute: true });
    }
  };

  return (
    <div className="flex h-full w-full max-w-6xl flex-1 min-h-0 flex-col lg:flex-row landscape:flex-row items-center justify-center gap-2.5 sm:gap-5 px-1 sm:px-3 select-none">
      {/* Hochformat Status & Modus */}
      <div className="flex lg:hidden landscape:hidden items-center justify-between gap-2 w-full max-w-[min(94vw,34rem)] px-3 py-1.5 bg-[#F8FAFC] border-[3px] border-[#334155] shadow-[0_4px_0_rgba(15,23,42,0.28)] text-xs sm:text-sm font-arcade uppercase text-[#1E293B] shrink-0">
        <div className="flex items-center gap-2.5">
          <span>
            FREI: <strong className="text-[#4F46E5]">{revealedSafe}/{safeCells}</strong>
          </span>
          <span>
            MINEN: <strong className="text-[#D97706]">{Math.max(0, mines - flagCount)}</strong>
          </span>
          <span>{elapsedSec}S</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => switchPreset(preset === 'normal' ? 'expert' : 'normal')}
            className="px-2 py-0.5 text-[11px] bg-[#E2E8F0] text-[#1E293B] border-2 border-[#475569] cursor-pointer"
          >
            {PRESETS[preset].label}
          </button>
          <button
            type="button"
            onClick={() => {
              playMoveSound();
              setFlagMode((v) => !v);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-arcade uppercase border-2 transition-all cursor-pointer ${
              flagMode
                ? 'bg-[#D97706] text-white border-[#78350F]'
                : 'bg-[#4F46E5] text-white border-[#312E81]'
            }`}
          >
            <Flag className="h-3 w-3" />
            <span>{flagMode ? 'FLAGGE' : 'SUCHEN'}</span>
          </button>
        </div>
      </div>

      {/* GROSSFLÄCHIGES MINENFELD */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        <div
          className="grid gap-1 sm:gap-1.5 landscape:gap-1 p-2 sm:p-3.5 landscape:p-2 bg-[#CBD5E1] border-[4px] border-[#1E293B] shadow-[inset_0_0_0_4px_#E2E8F0,0_12px_28px_rgba(15,23,42,0.45)] w-[min(94vw,calc(100dvh-10.5rem),34rem)] landscape:w-[min(60vw,calc(100dvh-3.5rem),30rem)] aspect-square"
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
                className={`flex items-center justify-center ${
                  size === 10 ? 'text-xs sm:text-base' : 'text-sm sm:text-lg'
                } font-arcade border-2 transition-all cursor-pointer active:scale-92 ${
                  cell.revealed
                    ? cell.isMine
                      ? cell.exploded
                        ? 'bg-[#E11D48] text-white border-[#881337] animate-pulse'
                        : 'bg-[#334155] text-[#FDA4AF] border-[#0F172A]'
                      : `bg-[#F8FAFC] ${ADJ_TEXT_COLOR[cell.adjacent] || 'text-[#1E293B]'} border-[#94A3B8]`
                    : cell.flagged
                      ? 'bg-[#F59E0B] text-white border-[#78350F] shadow-[inset_0_0_0_1px_#FDE68A]'
                      : 'bg-[#475569] hover:bg-[#64748B] text-white border-[#1E293B] shadow-[inset_0_2px_0_#94A3B8]'
                }`}
              >
                {cell.revealed ? (
                  cell.isMine ? (
                    <Bomb className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : cell.adjacent > 0 ? (
                    cell.adjacent
                  ) : (
                    ''
                  )
                ) : cell.flagged ? (
                  <Flag className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
                ) : (
                  ''
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Rechte Seitenleiste im Querformat & Desktop */}
      <aside className="hidden lg:flex landscape:flex flex-col justify-center gap-3 w-60 landscape:w-52 shrink-0 bg-[#F8FAFC] border-[3px] border-[#334155] shadow-[inset_0_0_0_3px_#FFFFFF,0_8px_0_rgba(15,23,42,0.35)] p-3.5">
        <CrystalReadout label="SICHERE FELDER" value={`${revealedSafe} / ${safeCells}`} />
        <CrystalReadout
          variant="gold"
          label="MINEN / ZEIT"
          value={`${Math.max(0, mines - flagCount)} 💣 • ${elapsedSec}S`}
        />

        <CrystalButton
          size="md"
          fullWidth
          variant={flagMode ? 'amber' : 'indigo'}
          onClick={() => {
            playMoveSound();
            setFlagMode((v) => !v);
          }}
        >
          <Flag className="h-4 w-4" />
          <span>{flagMode ? 'MODUS: FLAGGE' : 'MODUS: AUFDECKEN'}</span>
        </CrystalButton>

        <div className="pt-1 flex flex-col gap-1.5">
          <span className="font-arcade text-[10px] text-center text-[#475569] uppercase">
            SCHWIERIGKEIT (RECHTSKLICK = FLAGGE)
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <CrystalButton
              size="sm"
              variant={preset === 'normal' ? 'indigo' : 'secondary'}
              onClick={() => switchPreset('normal')}
            >
              8×8 (9)
            </CrystalButton>
            <CrystalButton
              size="sm"
              variant={preset === 'expert' ? 'indigo' : 'secondary'}
              onClick={() => switchPreset('expert')}
            >
              10×10 (15)
            </CrystalButton>
          </div>
        </div>
      </aside>
    </div>
  );
}
