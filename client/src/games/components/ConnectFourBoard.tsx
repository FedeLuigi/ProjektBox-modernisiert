import { useEffect, useRef, useState } from 'react';
import type { GameRendererProps } from '../types';
import { playMoveSound, playWinSound } from '../../utils/soundEffects';

export interface ConnectFourState {
  board: (string | null)[][];
  winningCoords: { row: number; col: number }[] | null;
  lastDrop: { row: number; col: number } | null;
}

export function ConnectFourBoard({
  gameState,
  myPlayer,
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

  // Zähle gesetzte Steine für Audio-Feedback und eigene Steinfarbe
  const moveCount = board.reduce(
    (sum, row) => sum + row.filter((cell) => cell !== null).length,
    0
  );

  useEffect(() => {
    if (moveCount > prevMoveCountRef.current) {
      if (winningCoords && winningCoords.length > 0) {
        playWinSound();
      } else {
        playMoveSound();
      }
    }
    prevMoveCountRef.current = moveCount;
  }, [moveCount, winningCoords]);

  // Ermittle die Landeposition (unterste freie Zeile) für eine Spalte
  const getLandingRow = (col: number): number => {
    for (let r = 5; r >= 0; r--) {
      if (!board[r] || board[r][col] === null) return r;
    }
    return -1;
  };

  const handleColClick = (col: number) => {
    if (!isMyTurn || isGameOver || disabled) return;
    if (getLandingRow(col) === -1) return; // Spalte voll
    onMove({ col });
  };

  // Aktuelle Zugfarbe anhand der geraden/ungeraden Zuganzahl (Rot beginnt immer)
  const activeColor = moveCount % 2 === 0 ? 'red' : 'yellow';

  return (
    <div className="flex h-full w-full max-w-6xl flex-1 min-h-0 flex-col lg:flex-row landscape:flex-row items-center justify-center gap-3 sm:gap-6 px-1 sm:px-3 select-none">
      {/* Spieler- & Zug-Statusleiste (oben im Hochformat, links/rechts im Querformat/Desktop) */}
      <div className="flex lg:flex-col landscape:flex-col items-center justify-between lg:justify-center landscape:justify-center gap-2.5 w-full max-w-[min(95vw,42rem)] lg:w-52 landscape:w-48 px-3.5 py-2.5 lg:p-4 bg-[#F8FAFC] border-[3px] border-[#334155] shadow-[inset_0_2px_0_#FFFFFF,0_6px_0_rgba(15,23,42,0.3)] shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={`h-5 w-5 rounded-full border-2 ${
              activeColor === 'red'
                ? 'bg-gradient-to-br from-[#FB7185] to-[#E11D48] border-[#881337]'
                : 'bg-gradient-to-br from-[#FDE68A] to-[#D97706] border-[#78350F]'
            }`}
          />
          <span className="font-arcade text-xs sm:text-sm uppercase text-[#1E293B]">
            {isGameOver
              ? 'SPIELENDE'
              : isMyTurn
                ? 'DEIN EINWURF'
                : `${opponent?.name || 'GEGNER'} AM ZUG`}
          </span>
        </div>

        <div className="font-arcade text-[11px] sm:text-xs text-[#475569] uppercase">
          STEIN #{moveCount + 1} / 42
        </div>

        {myPlayer && !myPlayer.isTvScreen && (
          <div className="hidden lg:block landscape:block w-full pt-2 border-t border-[#CBD5E1] text-center">
            <span className="font-arcade text-[11px] text-[#334155] uppercase">
              TIPPE AUF EINE SPALTE, UM DEINEN STEIN FALLEN ZU LASSEN
            </span>
          </div>
        )}
      </div>

      {/* GROSSFLÄCHIGES 7×6 VIER-GEWINNT-SPIELBRETT */}
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 w-full">
        <div className="flex flex-col items-center w-[min(95vw,calc((100dvh-8.8rem)*1.16),45rem)] landscape:w-[min(68vw,calc((100dvh-3.5rem)*1.16),42rem)]">
          {/* Spalten-Einwurf-Vorschau mit schwebendem Spielstein */}
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
                  className="h-7 sm:h-9 landscape:h-6 flex items-center justify-center font-arcade transition-all cursor-pointer disabled:cursor-default"
                  aria-label={`Spalte ${c + 1} einwerfen`}
                >
                  {canClick ? (
                    isHovered ? (
                      <div
                        className={`h-6 w-6 sm:h-7 sm:w-7 landscape:h-5 landscape:w-5 rounded-full border-2 animate-bounce shadow-md ${
                          activeColor === 'red'
                            ? 'bg-gradient-to-br from-[#FB7185] to-[#E11D48] border-white'
                            : 'bg-gradient-to-br from-[#FDE68A] to-[#D97706] border-white'
                        }`}
                      />
                    ) : (
                      <span className="text-sm sm:text-base text-[#F8FAFC]/85 hover:text-[#FBBF24] drop-shadow-[0_2px_0_#0F172A]">
                        ▼
                      </span>
                    )
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* 7 Spalten x 6 Zeilen Raster im edlen Deep-Slate Rahmen */}
          <div className="p-2.5 sm:p-4 landscape:p-2.5 bg-[#1E293B] border-[4px] border-[#0F172A] shadow-[inset_0_0_0_4px_#334155,0_12px_24px_rgba(15,23,42,0.5)] w-full">
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
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
                    className={`flex flex-col gap-1.5 sm:gap-2.5 p-0.5 sm:p-1 transition-colors rounded-sm ${
                      canClick ? 'cursor-pointer' : ''
                    } ${isColHovered ? 'bg-[#334155]/90' : ''}`}
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
                          className={`relative aspect-square w-full rounded-full transition-all duration-200 flex items-center justify-center border-2 ${
                            cellColor === null
                              ? isLandingTarget
                                ? activeColor === 'red'
                                  ? 'bg-[#E11D48]/35 border-[#FB7185] border-dashed scale-[0.96]'
                                  : 'bg-[#F59E0B]/35 border-[#FDE68A] border-dashed scale-[0.96]'
                                : 'bg-[#0F172A] border-[#334155] shadow-inner'
                              : cellColor === 'red'
                                ? isWinningCell
                                  ? 'bg-[#E11D48] border-white shadow-[0_0_18px_#FB7185] scale-105 animate-pulse'
                                  : 'bg-gradient-to-br from-[#FB7185] to-[#E11D48] border-[#881337] shadow-[inset_0_3px_0_rgba(255,255,255,0.5)]'
                                : isWinningCell
                                  ? 'bg-[#FBBF24] border-white shadow-[0_0_18px_#FDE68A] scale-105 animate-pulse'
                                  : 'bg-gradient-to-br from-[#FDE68A] to-[#D97706] border-[#78350F] shadow-[inset_0_3px_0_rgba(255,255,255,0.65)]'
                          }`}
                        >
                          {cellColor && (
                            <div className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full bg-white/55 -translate-y-1.5 -translate-x-1.5" />
                          )}
                          {isLastDropped && !isWinningCell && (
                            <div className="pointer-events-none absolute inset-1.5 rounded-full border-2 border-white/80" />
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
      </div>
    </div>
  );
}
