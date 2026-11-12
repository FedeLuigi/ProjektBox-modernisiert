import { useState } from 'react';
import { Bomb, Flag } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { getGameTheme } from '../../styles/uiTokens';

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
  gameId = 'minesweeper',
  isGameOver,
  disabled,
  onMove,
}: GameRendererProps) {
  const theme = getGameTheme(gameId);
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
      // Alle Minen kurz sichtbar machen und mit aktuellem Punktestand beenden
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
    <div className="flex flex-col items-center w-full max-w-[18.5rem] sm:max-w-xs gap-2.5 select-none">
      <div className="flex items-center justify-between w-full px-1 text-xs font-bold text-[#AEAEB2]">
        <span>Aufgedeckt: <strong className="text-white">{revealedSafe}/{safeCells}</strong></span>
        <button
          type="button"
          onClick={() => setFlagMode((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ring-1 transition-all cursor-pointer ${
            flagMode ? `${theme.activeSurface} ${theme.accentText}` : 'bg-white/[0.07] text-white/75 ring-white/10'
          }`}
        >
          <Flag className="h-3 w-3" />
          <span>{flagMode ? 'Flagge aktiv' : 'Aufdecken'}</span>
        </button>
      </div>

      <div className={`grid grid-cols-7 gap-1.5 p-2.5 rounded-3xl bg-[#161620]/95 ${theme.softRing} w-full aspect-square`}>
        {board.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              type="button"
              onClick={() => handleCellTap(r, c)}
              className={`rounded-lg flex items-center justify-center text-xs sm:text-sm font-black transition-all cursor-pointer active:scale-90 ${
                cell.revealed
                  ? cell.isMine
                    ? 'bg-rose-500/35 text-rose-300 ring-1 ring-rose-400'
                    : 'bg-white/[0.06] text-white/90'
                  : cell.flagged
                  ? `${theme.activeSurface} ${theme.accentText} ring-1`
                  : `bg-[#222230] hover:bg-[#2C2C3E] ring-1 ring-white/10 ${theme.hoverRing}`
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
    </div>
  );
}
