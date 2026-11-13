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
    <div className="relative grid grid-cols-3 gap-3 landscape:gap-2.5 p-4 landscape:p-3 bg-[#F5F3FF] border-[4px] border-[#4C1D95] shadow-[inset_0_0_0_4px_#DDD6FE,0_10px_0_rgba(15,23,42,0.42)] w-[min(78vw,20rem)] sm:w-[min(78vw,21rem)] landscape:w-[min(calc(100dvh-5.2rem),20rem)] max-h-[65dvh] landscape:max-h-[calc(100dvh-5.2rem)] aspect-square">
      {board.map((cell, idx) => {
        const isWinningCell = winningLine?.includes(idx);
        const canClick = isMyTurn && !isGameOver && !disabled && cell === null;

        return (
          <button
            key={idx}
            type="button"
            disabled={!canClick}
            onClick={() => handleCellClick(idx)}
            className={`relative flex items-center justify-center text-4xl sm:text-5xl font-arcade uppercase transition-all border-[3px] overflow-hidden ${
              cell === null
                ? canClick
                  ? 'bg-[#E2E8F0] hover:bg-[#DDD6FE] border-[#475569] active:scale-95 cursor-pointer shadow-[inset_0_0_0_2px_#FFFFFF]'
                  : 'bg-[#E2E8F0]/70 border-[#64748B] cursor-not-allowed opacity-75'
                : isWinningCell
                  ? 'bg-[#059669] text-white border-[#064E3B] shadow-[inset_0_0_0_3px_#6EE7B7,0_0_16px_rgba(16,185,129,0.75)] animate-pulse'
                  : cell === 'X'
                    ? 'bg-[#7C3AED] text-white border-[#4C1D95] shadow-[inset_0_0_0_2px_#C4B5FD]'
                    : 'bg-[#D97706] text-white border-[#78350F] shadow-[inset_0_0_0_2px_#FCD34D]'
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
              <span className="relative z-10 transform-gpu scale-110 drop-shadow-[0_2px_0_rgba(76,29,149,0.7)]">
                X
              </span>
            )}
            {cell === 'O' && (
              <span className="relative z-10 transform-gpu scale-110 drop-shadow-[0_2px_0_rgba(120,53,15,0.7)]">
                O
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
