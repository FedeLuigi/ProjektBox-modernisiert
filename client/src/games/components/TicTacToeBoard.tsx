import { useEffect, useRef, useState } from 'react';
import { Circle, Sparkles, Swords, X } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { playMoveSound, playWinSound, triggerHapticFeedback } from '../../utils/soundEffects';

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
        triggerHapticFeedback([20, 40, 30]);
      } else {
        playMoveSound();
        triggerHapticFeedback(12);
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
    <div className="flex h-full w-full max-w-4xl flex-1 min-h-0 flex-col items-center justify-center gap-2.5 sm:gap-4 px-2 select-none">
      {/* INTEGRIERTE CYBER-DUELL-LEISTE (direkt über dem Spielfeld, ohne äußere Card) */}
      <div className="grid w-full max-w-[min(92vw,calc(100dvh-8.5rem),34rem)] landscape:max-w-[min(78vw,32rem)] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 bg-[#0B192C]/90 border-[3px] border-[#1E3A5F] shadow-[0_8px_20px_rgba(0,0,0,0.45)] shrink-0">
        {/* Spieler X (Cyan) */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1 border-2 transition-all ${
            !isGameOver && activeSymbol === 'X'
              ? 'bg-[#083344] border-[#22D3EE] shadow-[0_0_14px_rgba(34,211,238,0.45)] scale-[1.03]'
              : 'bg-[#0F172A]/70 border-[#334155] opacity-65'
          }`}
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5 stroke-[3.5] text-[#22D3EE] shrink-0" />
          <span className="font-arcade text-xs sm:text-sm text-[#ECFEFF] uppercase truncate">
            STRATEGE X
          </span>
        </div>

        {/* Zug- & Runden-Indikator */}
        <div className="flex flex-col items-center justify-center px-2 text-center">
          <div className="inline-flex items-center gap-1.5 font-arcade text-xs sm:text-sm uppercase text-white">
            <Swords className="h-3.5 w-3.5 text-[#38BDF8]" />
            <span>
              {isGameOver
                ? winningLine
                  ? 'SIEGSLINIE!'
                  : 'REMIS'
                : isMyTurn
                  ? 'DEIN ZUG'
                  : `${opponent?.name || 'GEGNER'}`}
            </span>
          </div>
          {/* 9 Zug-Punkte */}
          <div className="mt-1 flex items-center gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i < filledCount
                    ? i % 2 === 0
                      ? 'bg-[#22D3EE]'
                      : 'bg-[#FBBF24]'
                    : 'bg-[#334155]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Spieler O (Gold) */}
        <div
          className={`justify-self-end flex items-center gap-2 px-2.5 py-1 border-2 transition-all ${
            !isGameOver && activeSymbol === 'O'
              ? 'bg-[#451A03] border-[#FBBF24] shadow-[0_0_14px_rgba(251,191,36,0.45)] scale-[1.03]'
              : 'bg-[#0F172A]/70 border-[#334155] opacity-65'
          }`}
        >
          <span className="font-arcade text-xs sm:text-sm text-[#FEF3C7] uppercase truncate">
            TAKTIKER O
          </span>
          <Circle className="h-4 w-4 sm:h-4.5 sm:w-4.5 stroke-[3.5] text-[#FBBF24] shrink-0" />
        </div>
      </div>

      {/* GROSSFLÄCHIGE CYBER-ARENA (3×3 NEON-MATRIX) */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        <div className="relative grid grid-cols-3 gap-2.5 sm:gap-4 landscape:gap-2.5 p-3 sm:p-5 landscape:p-3 bg-gradient-to-br from-[#0F243C] via-[#0B192C] to-[#07111E] border-[4px] border-[#06B6D4] shadow-[inset_0_0_24px_rgba(6,182,212,0.22),0_16px_36px_rgba(0,0,0,0.6)] w-[min(92vw,calc(100dvh-9rem),34rem)] landscape:w-[min(58vw,calc(100dvh-5.8rem),27rem)] aspect-square">
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
                className={`group relative flex items-center justify-center transition-all duration-150 border-[3px] overflow-hidden ${
                  cell === null
                    ? canClick
                      ? 'bg-[#132A46]/85 hover:bg-[#19385C] border-[#1E4976] hover:border-[#38BDF8] active:scale-95 cursor-pointer shadow-[inset_0_2px_0_rgba(255,255,255,0.08)]'
                      : 'bg-[#0F1E33]/75 border-[#1E293B] cursor-not-allowed opacity-75'
                    : isWinningCell
                      ? 'bg-gradient-to-br from-[#059669] to-[#047857] text-white border-[#6EE7B7] shadow-[0_0_24px_rgba(16,185,129,0.85)] scale-[1.03] z-10'
                      : cell === 'X'
                        ? 'bg-gradient-to-br from-[#083344] to-[#0E4F68] text-[#22D3EE] border-[#22D3EE] shadow-[inset_0_0_16px_rgba(34,211,238,0.28)]'
                        : 'bg-gradient-to-br from-[#451A03] to-[#78350F] text-[#FBBF24] border-[#FBBF24] shadow-[inset_0_0_16px_rgba(251,191,36,0.28)]'
                } ${winningLine && !isWinningCell && cell !== null ? 'opacity-45 scale-95' : ''}`}
              >
                {/* Subtiler Diagonal-Lichtschein */}
                <div
                  className="pointer-events-none absolute inset-0 bg-white/[0.06]"
                  style={{ clipPath: 'polygon(0 0, 62% 0, 35% 100%, 0 100%)' }}
                />

                {/* Eck-Markierungen für leere Felder */}
                {cell === null && (
                  <span className="pointer-events-none absolute top-1.5 left-1.5 h-2 w-2 border-t border-l border-[#38BDF8]/35" />
                )}

                {cell === 'X' && (
                  <X
                    className={`relative z-10 h-14 w-14 sm:h-20 sm:w-20 landscape:h-12 landscape:w-12 stroke-[3.5] transition-transform duration-150 ${
                      isWinningCell
                        ? 'text-white drop-shadow-[0_0_12px_#6EE7B7] scale-110'
                        : 'text-[#22D3EE] drop-shadow-[0_0_10px_rgba(34,211,238,0.75)]'
                    }`}
                  />
                )}

                {cell === 'O' && (
                  <Circle
                    className={`relative z-10 h-12 w-12 sm:h-18 sm:w-18 landscape:h-11 landscape:w-11 stroke-[3.5] transition-transform duration-150 ${
                      isWinningCell
                        ? 'text-white drop-shadow-[0_0_12px_#6EE7B7] scale-110'
                        : 'text-[#FBBF24] drop-shadow-[0_0_10px_rgba(251,191,36,0.75)]'
                    }`}
                  />
                )}

                {showPreview &&
                  (activeSymbol === 'X' ? (
                    <X className="relative z-10 h-12 w-12 sm:h-16 sm:w-16 stroke-[3] text-[#22D3EE]/35 scale-95" />
                  ) : (
                    <Circle className="relative z-10 h-11 w-11 sm:h-15 sm:w-15 stroke-[3] text-[#FBBF24]/35 scale-95" />
                  ))}

                {isWinningCell && (
                  <Sparkles className="pointer-events-none absolute top-1.5 right-1.5 h-4 w-4 text-[#A7F3D0] animate-spin" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
