import { useState } from 'react';
import type { GameRendererProps } from '../types';

export interface ConnectFourState {
  board: (string | null)[][];
  winningCoords: { row: number; col: number }[] | null;
  lastDrop: { row: number; col: number } | null;
}

export function ConnectFourBoard({
  gameState,
  isMyTurn,
  isGameOver,
  onMove,
  disabled,
}: GameRendererProps<ConnectFourState>) {
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

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
    <div className="flex flex-col items-center w-full max-w-[min(24rem,62dvh)] landscape:max-w-[min(25rem,calc((100dvh-6.2rem)*1.12))]">
      {/* Spalten-Auswahl-Pfeile */}
      <div className="grid grid-cols-7 gap-1.5 w-full px-3 mb-1 landscape:mb-0.5">
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
              className={`h-6 landscape:h-5 flex items-center justify-center font-arcade transition-all ${
                canClick
                  ? isHovered
                    ? 'text-[#FBBF24] scale-125 drop-shadow-[0_2px_0_#0F172A]'
                    : 'text-[#F8FAFC] hover:text-[#FBBF24]'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              ▼
            </button>
          );
        })}
      </div>

      {/* 7 Spalten x 6 Zeilen Raster im edlen Deep-Slate Rahmen für maximalen Kontrast der Spielsteine */}
      <div className="p-3 landscape:p-2 bg-[#1E293B] border-[4px] border-[#0F172A] shadow-[inset_0_0_0_4px_#334155,0_10px_0_rgba(15,23,42,0.5)] w-full">
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
                className={`flex flex-col gap-1.5 sm:gap-2 p-0.5 transition-colors ${
                  canClick && hoveredCol === colIdx ? 'bg-[#334155]/80 cursor-pointer' : ''
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
                      className={`aspect-square w-full rounded-full transition-transform flex items-center justify-center border-2 ${
                        cellColor === null
                          ? 'bg-[#0F172A] border-[#334155] shadow-inner'
                          : cellColor === 'red'
                            ? isWinningCell
                              ? 'bg-[#E11D48] border-white shadow-[0_0_16px_#FB7185] scale-105 animate-pulse'
                              : 'bg-gradient-to-br from-[#FB7185] to-[#E11D48] border-[#881337] shadow-[inset_0_2px_0_rgba(255,255,255,0.5)]'
                            : isWinningCell
                              ? 'bg-[#FBBF24] border-white shadow-[0_0_16px_#FDE68A] scale-105 animate-pulse'
                              : 'bg-gradient-to-br from-[#FDE68A] to-[#D97706] border-[#78350F] shadow-[inset_0_2px_0_rgba(255,255,255,0.65)]'
                      }`}
                    >
                      {cellColor && (
                        <div className="h-2 w-2 rounded-full bg-white/55 -translate-y-1 -translate-x-1" />
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
