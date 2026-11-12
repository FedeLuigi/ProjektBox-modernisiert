import { useState } from 'react';
import type { GameRendererProps } from '../types';
import { getGameTheme } from '../../styles/uiTokens';

export interface ConnectFourState {
  board: (string | null)[][];
  winningCoords: { row: number; col: number }[] | null;
  lastDrop: { row: number; col: number } | null;
}

export function ConnectFourBoard({
  gameId = 'connect',
  gameState,
  isMyTurn,
  isGameOver,
  onMove,
  disabled,
}: GameRendererProps<ConnectFourState>) {
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const theme = getGameTheme(gameId);

  const { board, winningCoords } = gameState || {
    board: Array.from({ length: 6 }, () => Array(7).fill(null)),
    winningCoords: null,
  };

  const handleColClick = (col: number) => {
    if (!isMyTurn || isGameOver || disabled) return;
    if (board[0] && board[0][col] !== null) return; // Spalte voll
    onMove({ col });
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[min(24rem,62dvh)]">
      {/* Spalten-Auswahl-Pfeile */}
      <div className="grid grid-cols-7 gap-1.5 w-full px-3 mb-1">
        {Array.from({ length: 7 }).map((_, c) => {
          const isColFull = board[0] && board[0][c] !== null;
          const isHovered = hoveredCol === c;
          const canClick = isMyTurn && !isColFull && !isGameOver && !disabled;

          return (
            <button
              key={c}
              type="button"
              disabled={!canClick}
              onClick={() => handleColClick(c)}
              onMouseEnter={() => setHoveredCol(c)}
              onMouseLeave={() => setHoveredCol(null)}
              className={`h-6 flex items-center justify-center rounded-t-lg transition-all ${
                canClick
                  ? isHovered
                    ? `${theme.accentIcon} scale-125`
                    : 'text-white/40 hover:text-white'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              ▼
            </button>
          );
        })}
      </div>

      {/* 7 Spalten x 6 Zeilen Raster */}
      <div className="p-3 rounded-3xl bg-[#141526] ring-2 ring-[#2A2B45] shadow-2xl backdrop-blur-xl w-full">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: 7 }).map((_, colIdx) => {
            const isColFull = board[0] && board[0][colIdx] !== null;
            const canClick = isMyTurn && !isColFull && !isGameOver && !disabled;

            return (
              <div
                key={colIdx}
                onClick={() => handleColClick(colIdx)}
                onMouseEnter={() => setHoveredCol(colIdx)}
                onMouseLeave={() => setHoveredCol(null)}
                className={`flex flex-col gap-1.5 sm:gap-2 p-0.5 rounded-xl transition-colors ${
                  canClick && hoveredCol === colIdx ? 'bg-white/5 cursor-pointer' : ''
                }`}
              >
                {Array.from({ length: 6 }).map((_, rowIdx) => {
                  const cellColor = board[rowIdx] ? board[rowIdx][colIdx] : null;
                  const isWinningCell = winningCoords?.some(
                    (coord) => coord.row === rowIdx && coord.col === colIdx
                  );

                  return (
                    <div
                      key={rowIdx}
                      className={`aspect-square w-full rounded-full transition-transform flex items-center justify-center ${
                        cellColor === null
                          ? 'bg-[#0B0B14] shadow-inner ring-1 ring-white/5'
                          : cellColor === 'red'
                            ? isWinningCell
                              ? 'bg-rose-500 shadow-[0_0_16px_#f43f5e] ring-2 ring-white scale-105 animate-pulse'
                              : 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-[0_2px_8px_rgba(244,63,94,0.4)] ring-1 ring-rose-400/50'
                            : isWinningCell
                              ? 'bg-amber-400 shadow-[0_0_16px_#fbbf24] ring-2 ring-white scale-105 animate-pulse'
                              : 'bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_2px_8px_rgba(251,191,36,0.4)] ring-1 ring-amber-300/50'
                      }`}
                    >
                      {cellColor && (
                        <div className="h-2 w-2 rounded-full bg-white/40 -translate-y-1.5 -translate-x-1.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
