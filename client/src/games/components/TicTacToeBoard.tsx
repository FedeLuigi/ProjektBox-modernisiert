import { useEffect, useRef, useState } from 'react';
import type { GameRendererProps } from '../types';
import { playMoveSound, playWinSound } from '../../utils/soundEffects';

export interface TicTacToeState {
  board: (string | null)[];
  winningLine: number[] | null;
}

export function TicTacToeBoard({
  gameState,
  opponent,
  isMyTurn,
  isGameOver,
  onMove,
  disabled,
}: GameRendererProps<TicTacToeState>) {
  const { board, winningLine } = gameState || {
    board: Array(9).fill(null),
    winningLine: null,
  };
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const prevFilledRef = useRef<number>(0);

  const filledCount = board.filter((c) => c !== null).length;
  const activeSymbol = filledCount % 2 === 0 ? 'X' : 'O';

  useEffect(() => {
    if (filledCount > prevFilledRef.current) {
      if (winningLine && winningLine.length > 0) {
        playWinSound();
      } else {
        playMoveSound();
      }
    }
    prevFilledRef.current = filledCount;
  }, [filledCount, winningLine]);

  const handleCellClick = (idx: number) => {
    if (!isMyTurn || isGameOver || disabled) return;
    if (board[idx] !== null) return;
    onMove({ cellIndex: idx });
  };

  return (
    <div className="flex h-full w-full max-w-5xl flex-1 min-h-0 flex-col lg:flex-row landscape:flex-row items-center justify-center gap-3 sm:gap-6 px-2 select-none">
      {/* Duell-Statusleiste */}
      <div className="flex lg:flex-col landscape:flex-col items-center justify-between lg:justify-center landscape:justify-center gap-3 w-full max-w-[min(90vw,32rem)] lg:w-56 landscape:w-48 px-4 py-2.5 lg:p-4 bg-[#F8FAFC] border-[3px] border-[#334155] shadow-[inset_0_2px_0_#FFFFFF,0_6px_0_rgba(15,23,42,0.3)] shrink-0">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-8 w-8 items-center justify-center font-arcade text-lg text-white border-2 ${
              activeSymbol === 'X'
                ? 'bg-[#7C3AED] border-[#4C1D95]'
                : 'bg-[#D97706] border-[#78350F]'
            }`}
          >
            {activeSymbol}
          </span>
          <div className="flex flex-col">
            <span className="font-arcade text-xs sm:text-sm text-[#1E293B] uppercase">
              {isGameOver
                ? winningLine
                  ? 'DREI IN EINER REIHE!'
                  : 'UNENTSCHIEDEN'
                : isMyTurn
                  ? 'DEIN ZUG'
                  : `${opponent?.name || 'GEGNER'} SETZT`}
            </span>
            <span className="font-arcade text-[10px] text-[#64748B] uppercase">
              ZUG {Math.min(filledCount + 1, 9)} VON 9
            </span>
          </div>
        </div>

        <div className="hidden lg:flex landscape:flex flex-col gap-1.5 w-full pt-2 border-t border-[#CBD5E1] text-center">
          <div className="flex items-center justify-between text-xs font-arcade px-2 py-1 bg-[#F5F3FF] border border-[#C4B5FD] text-[#5B21B6]">
            <span>SPIELER X</span>
            <span>VIOLETT</span>
          </div>
          <div className="flex items-center justify-between text-xs font-arcade px-2 py-1 bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309]">
            <span>SPIELER O</span>
            <span>GOLD</span>
          </div>
        </div>
      </div>

      {/* GROSSFLÄCHIGES 3×3 KRISTALL-SPIELFELD */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        <div className="relative grid grid-cols-3 gap-3 sm:gap-4 landscape:gap-2.5 p-3.5 sm:p-5 landscape:p-3 bg-[#F5F3FF] border-[4px] border-[#4C1D95] shadow-[inset_0_0_0_4px_#DDD6FE,0_12px_28px_rgba(15,23,42,0.45)] w-[min(90vw,calc(100dvh-9.5rem),32rem)] landscape:w-[min(62vw,calc(100dvh-3.5rem),28rem)] aspect-square">
          {board.map((cell, idx) => {
            const isWinningCell = winningLine?.includes(idx);
            const canClick = isMyTurn && !isGameOver && !disabled && cell === null;
            const showPreview = canClick && hoveredIdx === idx;

            return (
              <button
                key={idx}
                type="button"
                disabled={!canClick}
                onClick={() => handleCellClick(idx)}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`relative flex items-center justify-center text-5xl sm:text-7xl landscape:text-5xl font-arcade uppercase transition-all duration-150 border-[3px] overflow-hidden ${
                  cell === null
                    ? canClick
                      ? 'bg-[#E2E8F0] hover:bg-[#EDE9FE] border-[#475569] active:scale-95 cursor-pointer shadow-[inset_0_0_0_2px_#FFFFFF,0_4px_0_rgba(15,23,42,0.2)]'
                      : 'bg-[#E2E8F0]/75 border-[#64748B] cursor-not-allowed opacity-80'
                    : isWinningCell
                      ? 'bg-[#059669] text-white border-[#064E3B] shadow-[inset_0_0_0_3px_#6EE7B7,0_0_20px_rgba(16,185,129,0.8)] scale-[1.03] animate-pulse'
                      : cell === 'X'
                        ? 'bg-[#7C3AED] text-white border-[#4C1D95] shadow-[inset_0_0_0_2px_#C4B5FD,0_4px_0_rgba(76,29,149,0.4)]'
                        : 'bg-[#D97706] text-white border-[#78350F] shadow-[inset_0_0_0_2px_#FCD34D,0_4px_0_rgba(120,53,15,0.4)]'
                } ${winningLine && !isWinningCell && cell !== null ? 'opacity-65 scale-95' : ''}`}
                style={{
                  clipPath: 'polygon(0% 3%, 100% 0%, 98% 97%, 2% 100%)',
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 bg-white/15"
                  style={{ clipPath: 'polygon(0 0, 62% 0, 35% 100%, 0 100%)' }}
                />
                {cell === 'X' && (
                  <span className="relative z-10 transform-gpu scale-110 drop-shadow-[0_3px_0_rgba(76,29,149,0.7)]">
                    X
                  </span>
                )}
                {cell === 'O' && (
                  <span className="relative z-10 transform-gpu scale-110 drop-shadow-[0_3px_0_rgba(120,53,15,0.7)]">
                    O
                  </span>
                )}
                {showPreview && (
                  <span
                    className={`relative z-10 opacity-35 scale-105 ${
                      activeSymbol === 'X' ? 'text-[#7C3AED]' : 'text-[#D97706]'
                    }`}
                  >
                    {activeSymbol}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
