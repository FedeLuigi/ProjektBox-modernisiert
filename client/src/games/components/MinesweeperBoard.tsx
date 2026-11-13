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

  return (
    <div className="flex flex-col items-center w-full max-w-[18.5rem] sm:max-w-xs landscape:max-w-xl landscape:grid landscape:grid-cols-[auto_11.5rem] landscape:items-center landscape:justify-center landscape:gap-5 gap-2.5 select-none">
      {/* Hochformat Status & Modus */}
      <div className="flex landscape:hidden items-center justify-between w-full px-2 py-1.5 bg-[#9CE0FA] border-2 border-[#17608E] text-xs font-arcade uppercase text-[#15608E]">
        <span>SAFE: <strong className="text-[#0E486C]">{revealedSafe}/{safeCells}</strong></span>
        <button
          type="button"
          onClick={() => setFlagMode((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-arcade uppercase border-2 transition-all cursor-pointer ${
            flagMode ? 'bg-[#F6B969] text-white border-[#C48232]' : 'bg-[#2B9FD6] text-white border-[#0E5A8A]'
          }`}
        >
          <Flag className="h-3 w-3" />
          <span>{flagMode ? 'FLAG ON' : 'REVEAL'}</span>
        </button>
      </div>

      {/* 7x7 Minenfeld im Crystal-Design */}
      <div className="grid grid-cols-7 gap-1.5 landscape:gap-1 p-2.5 landscape:p-2 bg-[#52A9D6] border-[4px] border-[#17608E] shadow-[inset_0_0_0_4px_#8AD8F8,0_8px_0_rgba(14,62,96,0.38)] w-full landscape:w-[min(46vw,calc(100dvh-5.2rem),21rem)] aspect-square">
        {board.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              type="button"
              onClick={() => handleCellTap(r, c)}
              className={`flex items-center justify-center text-xs sm:text-sm font-arcade border-2 transition-all cursor-pointer active:scale-90 ${
                cell.revealed
                  ? cell.isMine
                    ? 'bg-[#E14B5A] text-white border-[#8F1D28]'
                    : 'bg-[#DDF6FF] text-[#15608E] border-[#52A9D6]'
                  : cell.flagged
                  ? 'bg-[#F6B969] text-white border-[#C48232] shadow-[inset_0_0_0_1px_#FDE0A6]'
                  : 'bg-[#9CE0FA] hover:bg-[#B6ECFD] text-[#15608E] border-[#17608E] shadow-[inset_0_0_0_1px_#DDF6FF]'
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
        <div className="flex flex-col items-center bg-[#9CE0FA] border-[3px] border-[#17608E] shadow-[inset_0_0_0_3px_#66C4EE] px-3 py-3 text-center">
          <CrystalReadout label="SAFE" value={`${revealedSafe}/${safeCells}`} />
        </div>

        <CrystalButton
          size="sm"
          fullWidth
          variant={flagMode ? 'success' : 'primary'}
          onClick={() => setFlagMode((v) => !v)}
        >
          {flagMode ? 'FLAG ON' : 'REVEAL'}
        </CrystalButton>
      </div>
    </div>
  );
}
