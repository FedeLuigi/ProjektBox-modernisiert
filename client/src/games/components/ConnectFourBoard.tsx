import { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { playMoveSound, playWinSound, triggerHapticFeedback } from '../../utils/soundEffects';

export interface ConnectFourState {
  board: (string | null)[][];
  winningCoords: { row: number; col: number }[] | null;
  lastDrop: { row: number; col: number } | null;
}

export function ConnectFourBoard({
  gameState,
  opponent,
  isMyTurn,
  isGameOver,
  onMove,
  disabled,
}: GameRendererProps<ConnectFourState>) {
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const prevMoveCountRef = useRef<number>(0);

  const { board, winningCoords, lastDrop } = gameState || {
    board: Array.from({ length: 6 }, () => Array(7).fill(null)),
    winningCoords: null,
    lastDrop: null,
  };

  const moveCount = board.reduce(
    (sum, row) => sum + row.filter((cell) => cell !== null).length,
    0
  );

  useEffect(() => {
    if (moveCount > prevMoveCountRef.current) {
      if (winningCoords && winningCoords.length > 0) {
        playWinSound();
        triggerHapticFeedback([20, 40, 30]);
      } else {
        playMoveSound();
        triggerHapticFeedback(14);
      }
    }
    prevMoveCountRef.current = moveCount;
  }, [moveCount, winningCoords]);

  const getLandingRow = (col: number): number => {
    for (let r = 5; r >= 0; r--) {
      if (!board[r] || board[r][col] === null) return r;
    }
    return -1;
  };

  const handleColClick = (col: number) => {
    if (!isMyTurn || isGameOver || disabled) return;
    if (getLandingRow(col) === -1) return;
    onMove({ col });
  };

  const activeColor = moveCount % 2 === 0 ? 'red' : 'yellow';
  const remainingDiscs = Math.max(0, 42 - moveCount);

  return (
    <div className="flex h-full w-full max-w-5xl flex-1 min-h-0 flex-col items-center justify-center gap-2 sm:gap-3 px-1 sm:px-3 select-none">
      {/* INTEGRIERTE GRAVITY-DUELL-LEISTE (direkt über dem Spielständer) */}
      <div className="grid w-full max-w-[min(95vw,calc((100dvh-8.5rem)*1.16),44rem)] landscape:max-w-[min(74vw,38rem)] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-1.5 sm:py-2 bg-[#0F1D3A]/95 border-[3px] border-[#3B82F6] shadow-[0_8px_20px_rgba(0,0,0,0.45)] shrink-0">
        {/* Roter Spieler */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1 border-2 transition-all ${
            !isGameOver && activeColor === 'red'
              ? 'bg-[#881337] border-[#FB7185] shadow-[0_0_14px_rgba(244,63,94,0.5)] scale-[1.02]'
              : 'bg-[#091224]/70 border-[#1E3A8A] opacity-65'
          }`}
        >
          <span className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-gradient-to-br from-[#FDA4AF] via-[#E11D48] to-[#9F1239] border-2 border-white shrink-0" />
          <span className="font-arcade text-xs sm:text-sm text-white uppercase truncate">
            RUBIN ROT
          </span>
        </div>

        {/* Status Mitte */}
        <div className="flex flex-col items-center justify-center px-2 text-center">
          <span className="font-arcade text-xs sm:text-sm uppercase text-[#EFF6FF]">
            {isGameOver
              ? winningCoords
                ? '4 GEWINNT!'
                : 'VOLLES BRETT'
              : isMyTurn
                ? 'SPALTE WÄHLEN'
                : `${opponent?.name || 'GEGNER'} WIRFT`}
          </span>
          <span className="font-arcade text-[10px] text-[#93C5FD] uppercase">
            NOCH {remainingDiscs} STEINE
          </span>
        </div>

        {/* Gelber/Goldener Spieler */}
        <div
          className={`justify-self-end flex items-center gap-2 px-2.5 py-1 border-2 transition-all ${
            !isGameOver && activeColor === 'yellow'
              ? 'bg-[#78350F] border-[#FCD34D] shadow-[0_0_14px_rgba(251,191,36,0.5)] scale-[1.02]'
              : 'bg-[#091224]/70 border-[#1E3A8A] opacity-65'
          }`}
        >
          <span className="font-arcade text-xs sm:text-sm text-[#FEF3C7] uppercase truncate">
            SONNEN GOLD
          </span>
          <span className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-gradient-to-br from-[#FEF08A] via-[#F59E0B] to-[#B45309] border-2 border-white shrink-0" />
        </div>
      </div>

      {/* GROSSFLÄCHIGES 7×6 ROYAL-COBALT SPIELRACK */}
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 w-full">
        <div className="flex flex-col items-center w-[min(95vw,calc((100dvh-9.2rem)*1.16),44rem)] landscape:w-[min(70vw,calc((100dvh-5.5rem)*1.16),37rem)]">
          {/* Spalten-Einwurf-Zeile mit schwebendem 3D-Spielstein */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 w-full px-3 sm:px-4 mb-1">
            {Array.from({ length: 7 }).map((_, c) => {
              const isColFull = getLandingRow(c) === -1;
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
                  className="h-6 sm:h-8 landscape:h-5 flex items-center justify-center font-arcade transition-all cursor-pointer disabled:cursor-default"
                  aria-label={`Spalte ${c + 1} einwerfen`}
                >
                  {canClick ? (
                    isHovered ? (
                      <div
                        className={`h-6 w-6 sm:h-7 sm:w-7 landscape:h-5 landscape:w-5 rounded-full border-2 animate-bounce shadow-lg ${
                          activeColor === 'red'
                            ? 'bg-gradient-to-br from-[#FDA4AF] via-[#E11D48] to-[#881337] border-white'
                            : 'bg-gradient-to-br from-[#FEF08A] via-[#F59E0B] to-[#92400E] border-white'
                        }`}
                      />
                    ) : (
                      <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5 text-[#93C5FD]/85 hover:text-[#FCD34D]" />
                    )
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* 3D Royal-Blue Spielständer */}
          <div className="relative p-2.5 sm:p-4 landscape:p-2 bg-gradient-to-b from-[#1D4ED8] via-[#1E3A8A] to-[#172554] border-[4px] border-[#60A5FA] shadow-[inset_0_3px_0_rgba(255,255,255,0.28),0_16px_36px_rgba(0,0,0,0.65)] w-full">
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 landscape:gap-1.5">
              {Array.from({ length: 7 }).map((_, colIdx) => {
                const landingRow = getLandingRow(colIdx);
                const isColFull = landingRow === -1;
                const canClick = isMyTurn && !isColFull && !isGameOver && !disabled;
                const isColHovered = canClick && hoveredCol === colIdx;

                return (
                  <div
                    key={colIdx}
                    onClick={() => handleColClick(colIdx)}
                    onMouseEnter={() => setHoveredCol(colIdx)}
                    onMouseLeave={() => setHoveredCol(null)}
                    className={`flex flex-col gap-1.5 sm:gap-2.5 landscape:gap-1.5 p-0.5 sm:p-1 transition-colors rounded-md ${
                      canClick ? 'cursor-pointer' : ''
                    } ${isColHovered ? 'bg-[#3B82F6]/35' : ''}`}
                  >
                    {Array.from({ length: 6 }).map((_, rowIdx) => {
                      const cellColor = board[rowIdx] ? board[rowIdx][colIdx] : null;
                      const isWinningCell = winningCoords?.some(
                        (coord) => coord.row === rowIdx && coord.col === colIdx
                      );
                      const isLastDropped =
                        lastDrop?.row === rowIdx && lastDrop?.col === colIdx;
                      const isLandingTarget = isColHovered && landingRow === rowIdx;

                      return (
                        <div
                          key={rowIdx}
                          className={`relative aspect-square w-full rounded-full transition-all duration-200 flex items-center justify-center border-[2.5px] ${
                            cellColor === null
                              ? isLandingTarget
                                ? activeColor === 'red'
                                  ? 'bg-[#E11D48]/35 border-[#FDA4AF] border-dashed scale-[0.96]'
                                  : 'bg-[#F59E0B]/35 border-[#FEF08A] border-dashed scale-[0.96]'
                                : 'bg-[#070E20] border-[#1E3A8A] shadow-[inset_0_4px_8px_rgba(0,0,0,0.85)]'
                              : cellColor === 'red'
                                ? isWinningCell
                                  ? 'bg-gradient-to-br from-[#FDA4AF] via-[#E11D48] to-[#881337] border-white shadow-[0_0_22px_#FB7185] scale-105 animate-pulse z-10'
                                  : 'bg-gradient-to-br from-[#FB7185] via-[#E11D48] to-[#881337] border-[#4C0519] shadow-[inset_0_3px_0_rgba(255,255,255,0.5)]'
                                : isWinningCell
                                  ? 'bg-gradient-to-br from-[#FEF08A] via-[#FBBF24] to-[#B45309] border-white shadow-[0_0_22px_#FDE68A] scale-105 animate-pulse z-10'
                                  : 'bg-gradient-to-br from-[#FDE68A] via-[#F59E0B] to-[#92400E] border-[#451A03] shadow-[inset_0_3px_0_rgba(255,255,255,0.65)]'
                          }`}
                        >
                          {/* 3D Rillen-Prägung auf gesetzten Spielsteinen */}
                          {cellColor && (
                            <div
                              className={`pointer-events-none inset-2 absolute rounded-full border ${
                                cellColor === 'red'
                                  ? 'border-[#FDA4AF]/45'
                                  : 'border-[#FEF3C7]/55'
                              }`}
                            />
                          )}
                          {cellColor && (
                            <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-white/50 -translate-y-1.5 -translate-x-1.5" />
                          )}
                          {isLastDropped && !isWinningCell && (
                            <div className="pointer-events-none absolute inset-1 rounded-full border-2 border-white/90" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Standfüße-Optik unten */}
            <div className="pointer-events-none absolute -bottom-2 left-3 h-2 w-8 bg-[#1E3A8A] border-x-2 border-b-2 border-[#60A5FA]" />
            <div className="pointer-events-none absolute -bottom-2 right-3 h-2 w-8 bg-[#1E3A8A] border-x-2 border-b-2 border-[#60A5FA]" />
          </div>
        </div>
      </div>
    </div>
  );
}
