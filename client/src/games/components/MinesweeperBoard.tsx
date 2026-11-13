import { useState } from 'react';
import { Bomb, Flag } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { CrystalButton, CrystalReadout } from '../../components/CrystalUI';

const SIZE = 7;
const MINES = 7;

interface Cell {
  isMine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

function createBoard(): Cell[][] {
  const board: Cell[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => ({
      isMine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    }))
  );

  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * SIZE);
    const c = Math.floor(Math.random() * SIZE);
    if (!board[r][c].isMine) {
      board[r][c].isMine = true;
      placed++;
    }
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc].isMine) {
            count++;
          }
        }
      }
      board[r][c].adjacent = count;
    }
  }
  return board;
}

function revealFlood(board: Cell[][], r: number, c: number) {
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
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !board[nr][nc].revealed) {
            stack.push([nr, nc]);
          }
        }
      }
    }
  }
}

export function MinesweeperBoard({
  isGameOver,
  disabled,
  onMove,
}: GameRendererProps) {
  const [board, setBoard] = useState<Cell[][]>(() => createBoard());
  const [flagMode, setFlagMode] = useState(false);
  const [ended, setEnded] = useState(false);

  const safeCells = SIZE * SIZE - MINES;
  const revealedSafe = board.flat().filter((c) => c.revealed && !c.isMine).length;

  const handleCellTap = (r: number, c: number) => {
    if (isGameOver || disabled || ended) return;
    const next = board.map((row) => row.map((cell) => ({ ...cell })));
    const target = next[r][c];
    if (target.revealed) return;

    if (flagMode) {
      target.flagged = !target.flagged;
      setBoard(next);
      return;
    }

    if (target.flagged) return;

    if (target.isMine) {
      for (const row of next) {
        for (const cell of row) {
          if (cell.isMine) cell.revealed = true;
        }
      }
      setBoard(next);
      setEnded(true);
      const pts = revealedSafe * 15;
      setTimeout(() => onMove({ score: pts, isAbsolute: true, finish: true }), 420);
      return;
    }

    revealFlood(next, r, c);
    setBoard(next);

    const nowRevealed = next.flat().filter((cell) => cell.revealed && !cell.isMine).length;
    const score = nowRevealed * 15;

    if (nowRevealed >= safeCells) {
      setEnded(true);
      setTimeout(() => onMove({ score: score + 200, isAbsolute: true, finish: true }), 260);
    } else {
      onMove({ score, isAbsolute: true });
    }
  };

  const ADJ_TEXT_COLOR: Record<number, string> = {
    1: 'text-[#2563EB]',
    2: 'text-[#059669]',
    3: 'text-[#E11D48]',
    4: 'text-[#7C3AED]',
    5: 'text-[#D97706]',
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[18.5rem] sm:max-w-xs landscape:max-w-xl landscape:grid landscape:grid-cols-[auto_11.5rem] landscape:items-center landscape:justify-center landscape:gap-5 gap-2.5 select-none">
      {/* Hochformat Status & Modus */}
      <div className="flex landscape:hidden items-center justify-between w-full px-3 py-1.5 bg-[#F8FAFC] border-[3px] border-[#334155] shadow-[0_3px_0_rgba(15,23,42,0.25)] text-xs font-arcade uppercase text-[#1E293B]">
        <span>SAFE: <strong className="text-[#4F46E5]">{revealedSafe}/{safeCells}</strong></span>
        <button
          type="button"
          onClick={() => setFlagMode((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-arcade uppercase border-2 transition-all cursor-pointer ${
            flagMode ? 'bg-[#D97706] text-white border-[#78350F]' : 'bg-[#4F46E5] text-white border-[#312E81]'
          }`}
        >
          <Flag className="h-3 w-3" />
          <span>{flagMode ? 'FLAG ON' : 'REVEAL'}</span>
        </button>
      </div>

      {/* 7x7 Minenfeld im taktischen Slate-Indigo-Design mit farbcodierten Zahlen */}
      <div className="grid grid-cols-7 gap-1.5 landscape:gap-1 p-2.5 landscape:p-2 bg-[#CBD5E1] border-[4px] border-[#1E293B] shadow-[inset_0_0_0_4px_#E2E8F0,0_10px_0_rgba(15,23,42,0.42)] w-full landscape:w-[min(46vw,calc(100dvh-5.2rem),21rem)] aspect-square">
        {board.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              type="button"
              onClick={() => handleCellTap(r, c)}
              className={`flex items-center justify-center text-xs sm:text-sm font-arcade border-2 transition-all cursor-pointer active:scale-90 ${
                cell.revealed
                  ? cell.isMine
                    ? 'bg-[#E11D48] text-white border-[#881337]'
                    : `bg-[#F8FAFC] ${ADJ_TEXT_COLOR[cell.adjacent] || 'text-[#1E293B]'} border-[#94A3B8]`
                  : cell.flagged
                  ? 'bg-[#F59E0B] text-white border-[#78350F] shadow-[inset_0_0_0_1px_#FDE68A]'
                  : 'bg-[#475569] hover:bg-[#64748B] text-white border-[#1E293B] shadow-[inset_0_2px_0_#94A3B8]'
              }`}
            >
              {cell.revealed ? (
                cell.isMine ? (
                  <Bomb className="h-3.5 w-3.5" />
                ) : cell.adjacent > 0 ? (
                  cell.adjacent
                ) : (
                  ''
                )
              ) : cell.flagged ? (
                <Flag className="h-3 w-3" />
              ) : (
                ''
              )}
            </button>
          ))
        )}
      </div>

      {/* Rechte Seitenleiste im Querformat */}
      <div className="hidden landscape:flex flex-col gap-3 w-full">
        <div className="flex flex-col items-center bg-[#F8FAFC] border-[3px] border-[#334155] shadow-[inset_0_0_0_3px_#FFFFFF,0_6px_0_rgba(15,23,42,0.3)] px-3 py-3 text-center">
          <CrystalReadout label="SAFE" value={`${revealedSafe}/${safeCells}`} />
        </div>

        <CrystalButton
          size="sm"
          fullWidth
          variant={flagMode ? 'amber' : 'indigo'}
          onClick={() => setFlagMode((v) => !v)}
        >
          {flagMode ? 'FLAG ON' : 'REVEAL'}
        </CrystalButton>
      </div>
    </div>
  );
}
