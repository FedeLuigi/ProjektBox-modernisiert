import type { GameRendererProps } from '../types';

export interface TicTacToeState {
  board: (string | null)[];
  winningLine: number[] | null;
}

export function TicTacToeBoard({
  gameState,
  isMyTurn,
  isGameOver,
  onMove,
  disabled,
}: GameRendererProps<TicTacToeState>) {
  const { board, winningLine } = gameState || { board: Array(9).fill(null), winningLine: null };

  const handleCellClick = (idx: number) => {
    if (!isMyTurn || isGameOver || disabled) return;
    if (board[idx] !== null) return;
    onMove({ cellIndex: idx });
  };

  return (
    <div className="relative grid grid-cols-3 gap-3 landscape:gap-2.5 p-4 landscape:p-3 bg-[#9CE0FA] border-[4px] border-[#17608E] shadow-[inset_0_0_0_4px_#66C4EE,0_8px_0_rgba(14,62,96,0.38)] w-[min(78vw,20rem)] sm:w-[min(78vw,21rem)] landscape:w-[min(calc(100dvh-5.2rem),20rem)] max-h-[65dvh] landscape:max-h-[calc(100dvh-5.2rem)] aspect-square">
      {board.map((cell, idx) => {
        const isWinningCell = winningLine?.includes(idx);
        const canClick = isMyTurn && !isGameOver && !disabled && cell === null;

        return (
          <button
            key={idx}
            type="button"
            disabled={!canClick}
            onClick={() => handleCellClick(idx)}
            className={`relative flex items-center justify-center text-4xl sm:text-5xl font-arcade uppercase transition-all border-[3px] border-[#17608E] overflow-hidden ${
              cell === null
                ? canClick
                  ? 'bg-[#52A9D6] hover:bg-[#38ACE0] active:scale-95 cursor-pointer shadow-[inset_0_0_0_2px_#8AD8F8]'
                  : 'bg-[#52A9D6]/60 cursor-not-allowed opacity-75'
                : isWinningCell
                  ? 'bg-[#F6B969] text-white border-[#C48232] shadow-[inset_0_0_0_3px_#FDE0A6,0_0_16px_rgba(246,185,105,0.75)] animate-pulse'
                  : cell === 'X'
                    ? 'bg-[#2B9FD6] text-white shadow-[inset_0_0_0_2px_#7DD3FA]'
                    : 'bg-[#F3AC58] text-white border-[#C48232] shadow-[inset_0_0_0_2px_#FDE0A6]'
            }`}
            style={{
              clipPath: 'polygon(0% 3%, 100% 0%, 98% 97%, 2% 100%)',
            }}
          >
            {/* Diagonal crystal facet */}
            <div
              className="pointer-events-none absolute inset-0 bg-white/15"
              style={{ clipPath: 'polygon(0 0, 62% 0, 35% 100%, 0 100%)' }}
            />
            {cell === 'X' && (
              <span className="relative z-10 transform-gpu scale-110 drop-shadow-[0_2px_0_rgba(14,90,138,0.65)]">
                X
              </span>
            )}
            {cell === 'O' && (
              <span className="relative z-10 transform-gpu scale-110 drop-shadow-[0_2px_0_rgba(140,78,12,0.65)]">
                O
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
